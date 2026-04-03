/**
 * iTerm2-based session factory — dispatches phases into iTerm2 tabs and panes.
 *
 * Creates one tab per epic, one pane per dispatched phase/feature.
 * Completion is detected via fs.watch on *.output.json files in
 * .beastmode/artifacts/<phase>/.
 *
 * Badge notifications fire on errors and blocked gates only —
 * no badges on normal completion or phase transitions.
 */

import { watch, type FSWatcher } from "node:fs";
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";
import type { IIt2Client, It2Session } from "./it2-client.js";
import type {
  SessionFactory,
  SessionCreateOpts,
  SessionHandle,
} from "./session.js";
import type { SessionResult } from "./watch-types.js";
import { filenameMatchesEpic } from "./phase-output.js";
import * as worktree from "./worktree.js";

/** Function that creates a worktree and returns its info. */
export type CreateWorktreeFn = (
  slug: string,
  opts: { cwd: string },
) => Promise<{ path: string }>;

/** Notification event classification for badge filtering. */
type NotificationEvent = "error" | "blocked-gate" | "completion" | "transition";

export class ITermSessionFactory implements SessionFactory {
  private client: IIt2Client;
  private createWorktree: CreateWorktreeFn;
  private tabs = new Map<string, string>(); // epicSlug -> tab session ID
  private panes = new Map<string, string>(); // paneKey -> pane session ID
  private tabHasInitialPane = new Set<string>(); // epicSlugs where tab session is used as first pane
  private watchers = new Map<string, FSWatcher>(); // session id -> fs watcher
  private watchTimeoutMs: number;
  private reconciled = false;

  constructor(
    client: IIt2Client,
    opts?: { watchTimeoutMs?: number; createWorktree?: CreateWorktreeFn },
  ) {
    this.client = client;
    this.createWorktree =
      opts?.createWorktree ?? ((slug, o) => worktree.create(slug, o));
    this.watchTimeoutMs = opts?.watchTimeoutMs ?? 3_600_000; // 60 min default
  }

  /**
   * Reconcile existing iTerm2 sessions with our internal state.
   *
   * On first call, queries iTerm2 for all sessions via listSessions().
   * Sessions named bm-* that are alive are adopted into our tab map.
   * Stale sessions (isAlive === false) are closed.
   * Idempotent — subsequent calls are no-ops.
   */
  async reconcile(): Promise<void> {
    if (this.reconciled) return;
    this.reconciled = true;

    let sessions: It2Session[];
    try {
      sessions = await this.client.listSessions();
    } catch {
      return; // can't query — skip reconciliation
    }

    const bmSessions = sessions.filter((s) => s.name.startsWith("bm-"));

    for (const session of bmSessions) {
      const epicSlug = session.name.replace(/^bm-/, "");

      if (session.isAlive) {
        // Adopt live session — store in tabs map
        this.tabs.set(epicSlug, session.id);
        this.tabHasInitialPane.add(epicSlug);
      } else {
        // Stale session — close it
        try {
          await this.client.closeSession(session.id);
        } catch {
          // best-effort
        }
      }
    }
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    const { epicSlug, phase, featureSlug, args, projectRoot } = opts;

    // Run reconciliation once on first create
    await this.reconcile();

    // Record start time before any setup — used to filter stale output.json
    const startTime = Date.now();

    // Derive names
    const worktreeSlug = epicSlug;
    const id = `it2-${worktreeSlug}-${Date.now()}`;
    const paneKey = featureSlug
      ? `${epicSlug}/${phase}-${featureSlug}`
      : `${epicSlug}/${phase}`;

    // Create worktree (idempotent)
    const wt = await this.createWorktree(worktreeSlug, { cwd: projectRoot });

    // Get or create tab for this epic
    let tabSessionId = this.tabs.get(epicSlug);
    if (!tabSessionId) {
      tabSessionId = await this.client.createTab();
      await this.client.setTabTitle(tabSessionId, `bm-${epicSlug}`);
      this.tabs.set(epicSlug, tabSessionId);
    }

    // Create pane: first phase gets the tab session, subsequent phases split
    let paneSessionId: string;
    if (!this.tabHasInitialPane.has(epicSlug)) {
      // First phase in this epic — use the tab session directly
      paneSessionId = tabSessionId;
      this.tabHasInitialPane.add(epicSlug);
    } else {
      // Subsequent phases — split vertically from the tab
      paneSessionId = await this.client.splitPane(tabSessionId);
    }

    // Store pane ID
    this.panes.set(paneKey, paneSessionId);

    // cd into the worktree, then run the beastmode command
    const command = `cd ${wt.path} && beastmode ${phase} ${args.join(" ")}`;
    await this.client.sendText(paneSessionId, command);

    // Derive artifact directory where output.json will appear
    const artifactDir = resolve(
      wt.path,
      ".beastmode",
      "artifacts",
      opts.phase,
    );

    // Build the expected output.json suffix for this specific session.
    const outputSuffix = featureSlug
      ? `-${epicSlug}-${featureSlug}.output.json`
      : `-${epicSlug}.output.json`;

    // Set up promise that resolves when output.json appears
    const promise = this.watchForMarker(id, artifactDir, startTime, opts.signal, outputSuffix, epicSlug, !featureSlug);

    // Handle abort — close pane
    const onAbort = async () => {
      this.cleanupWatcher(id);
      try {
        if (paneSessionId !== tabSessionId) {
          await this.client.closeSession(paneSessionId);
        }
      } catch {
        // best-effort
      }
    };
    opts.signal.addEventListener("abort", onAbort, { once: true });

    // Wrap promise with badge notification handling
    const notifiedPromise = promise.then(async (result) => {
      opts.signal.removeEventListener("abort", onAbort);

      // Badge notifications: ONLY on errors and blocked gates
      if (!result.success) {
        const event = this.classifyFailure(result);
        if (event === "error" || event === "blocked-gate") {
          try {
            const badgeText =
              event === "error"
                ? `ERROR: ${phase} failed`
                : `BLOCKED: ${phase} gate`;
            await this.client.setBadge(paneSessionId, badgeText);
          } catch {
            // best-effort notification
          }
        }
      }
      // No badge for normal completions — explicit per acceptance criteria

      // Close pane after completion (but not the tab session itself)
      try {
        if (paneSessionId !== tabSessionId) {
          await this.client.closeSession(paneSessionId);
        }
      } catch {
        // best-effort
      }

      this.panes.delete(paneKey);
      return result;
    });

    return { id, worktreeSlug, promise: notifiedPromise };
  }

  /** Classify a failure result for notification filtering. */
  private classifyFailure(_result: SessionResult): NotificationEvent {
    // All failures are "error" for now — blocked-gate detection can be
    // refined when output.json includes gate status
    return "error";
  }

  async cleanup(epicSlug: string): Promise<void> {
    const tabSessionId = this.tabs.get(epicSlug);
    if (!tabSessionId) return;

    try {
      await this.client.closeSession(tabSessionId);
    } catch {
      // best-effort
    }
    this.tabs.delete(epicSlug);
    this.tabHasInitialPane.delete(epicSlug);

    // Clean up pane entries for this epic
    for (const [key] of this.panes) {
      if (key.startsWith(`${epicSlug}/`) || key === epicSlug) {
        this.panes.delete(key);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Private methods — shared artifact-watching logic (from CmuxSessionFactory)
  // -------------------------------------------------------------------------

  /** Watch for a specific output.json file in the artifact directory. */
  private watchForMarker(
    sessionId: string,
    artifactDir: string,
    startTime: number,
    signal: AbortSignal,
    outputSuffix: string,
    epicSlug: string,
    broadMatch: boolean,
  ): Promise<SessionResult> {
    return new Promise<SessionResult>((resolvePromise, rejectPromise) => {
      // Check if an output.json already exists that is newer than dispatch time.
      const existing = this.findOutputJson(artifactDir, startTime, outputSuffix)
        ?? (broadMatch ? this.findOutputJsonBroad(artifactDir, epicSlug, startTime) : null);
      if (existing) {
        const result = this.readOutputJson(existing, startTime);
        if (result) {
          resolvePromise(result);
          return;
        }
      }

      let watcher: FSWatcher;

      const cleanup = () => {
        this.cleanupWatcher(sessionId);
        clearTimeout(timeout);
      };

      try {
        // Ensure directory exists for watching
        mkdirSync(artifactDir, { recursive: true });

        watcher = watch(artifactDir, (_eventType, filename) => {
          if (!filename || !filename.endsWith(".output.json")) return;
          if (!filename.endsWith(outputSuffix) &&
              !(broadMatch && filenameMatchesEpic(filename, epicSlug))) return;
          const filePath = resolve(artifactDir, filename);
          try {
            if (statSync(filePath).mtimeMs < startTime) return;
          } catch {
            return;
          }
          const result = this.readOutputJson(filePath, startTime);
          if (result) {
            cleanup();
            resolvePromise(result);
          }
        });
        this.watchers.set(sessionId, watcher);
      } catch {
        // Fall back to polling
        const pollInterval = setInterval(() => {
          const found = this.findOutputJson(artifactDir, startTime, outputSuffix)
            ?? (broadMatch ? this.findOutputJsonBroad(artifactDir, epicSlug, startTime) : null);
          if (found) {
            clearInterval(pollInterval);
            clearTimeout(timeout);
            const result = this.readOutputJson(found, startTime);
            resolvePromise(
              result ?? {
                success: false,
                exitCode: 1,
                costUsd: 0,
                durationMs: Date.now() - startTime,
              },
            );
          }
        }, 5_000);

        const timeout = setTimeout(() => {
          clearInterval(pollInterval);
          // Broad fallback: check for any epic-matching output (e.g. per-feature plan outputs)
          const broadMatch = this.findOutputJsonBroad(artifactDir, epicSlug, startTime);
          if (broadMatch) {
            const result = this.readOutputJson(broadMatch, startTime);
            if (result) { resolvePromise(result); return; }
          }
          resolvePromise({
            success: false,
            exitCode: 1,
            costUsd: 0,
            durationMs: Date.now() - startTime,
          });
        }, this.watchTimeoutMs);

        signal.addEventListener(
          "abort",
          () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
            rejectPromise(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );

        return;
      }

      // Safety timeout
      const timeout = setTimeout(() => {
        cleanup();
        // Broad fallback: check for any epic-matching output (e.g. per-feature plan outputs)
        const broadMatch = this.findOutputJsonBroad(artifactDir, epicSlug, startTime);
        if (broadMatch) {
          const result = this.readOutputJson(broadMatch, startTime);
          if (result) { resolvePromise(result); return; }
        }
        resolvePromise({
          success: false,
          exitCode: 1,
          costUsd: 0,
          durationMs: Date.now() - startTime,
        });
      }, this.watchTimeoutMs);

      // Handle abort
      signal.addEventListener(
        "abort",
        () => {
          cleanup();
          rejectPromise(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }

  /** Find an output.json matching the epic slug (broad match for timeout fallback). */
  private findOutputJsonBroad(dir: string, epicSlug: string, newerThanMs?: number): string | null {
    try {
      const files = readdirSync(dir) as string[];
      const candidates = files
        .filter((f: string) => f.endsWith(".output.json") && filenameMatchesEpic(f, epicSlug))
        .map((f: string) => resolve(dir, f))
        .filter((fullPath: string) => {
          if (newerThanMs === undefined) return true;
          try {
            return statSync(fullPath).mtimeMs >= newerThanMs;
          } catch {
            return false;
          }
        })
        .sort();
      return candidates.length > 0 ? candidates[candidates.length - 1] : null;
    } catch {
      return null;
    }
  }

  /** Find an output.json file in the artifact directory matching the suffix. */
  private findOutputJson(dir: string, newerThanMs?: number, suffix?: string): string | null {
    try {
      const files = readdirSync(dir) as string[];
      const matchSuffix = suffix ?? ".output.json";
      const candidates = files
        .filter((f: string) => f.endsWith(matchSuffix))
        .map((f: string) => resolve(dir, f))
        .filter((fullPath: string) => {
          if (newerThanMs === undefined) return true;
          try {
            return statSync(fullPath).mtimeMs >= newerThanMs;
          } catch {
            return false;
          }
        })
        .sort();
      return candidates.length > 0 ? candidates[candidates.length - 1] : null;
    } catch {
      return null;
    }
  }

  /** Read and parse a PhaseOutput JSON file. */
  private readOutputJson(
    filePath: string,
    startTime: number,
  ): SessionResult | null {
    try {
      const raw = readFileSync(filePath, "utf-8");
      const output = JSON.parse(raw);
      if (!output.status || !output.artifacts) return null;
      return {
        success: output.status === "completed",
        exitCode: output.status === "completed" ? 0 : 1,
        costUsd: 0,
        durationMs: Date.now() - startTime,
      };
    } catch {
      return null;
    }
  }

  private cleanupWatcher(sessionId: string): void {
    const watcher = this.watchers.get(sessionId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(sessionId);
    }
  }
}
