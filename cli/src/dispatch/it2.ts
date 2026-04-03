/**
 * iTerm2 integration — client, session factory, and availability helpers.
 *
 * Communicates with iTerm2 by shelling out to the `it2` binary.
 * Creates one tab per epic, one pane per dispatched phase/feature.
 * Completion is detected via fs.watch on *.output.json files.
 *
 * Merged from: it2-client.ts, it2-session.ts
 */

import { watch, type FSWatcher } from "node:fs";
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";
import type {
  SessionFactory,
  SessionCreateOpts,
  SessionHandle,
} from "./factory.js";
import type { SessionResult } from "./types.js";
import { filenameMatchesEpic } from "../artifacts/reader.js";
import * as worktree from "../git/worktree.js";
import * as store from "../manifest/store.js";

// ==========================================================================
// Error classes (from it2-client.ts)
// ==========================================================================

export class It2Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "It2Error";
  }
}

export class It2ConnectionError extends It2Error {
  constructor(message: string = "it2 is not available") {
    super(message);
    this.name = "It2ConnectionError";
  }
}

export class It2NotInstalledError extends It2Error {
  constructor(
    message: string = "it2 CLI not installed. Install via: pip install iterm2",
  ) {
    super(message);
    this.name = "It2NotInstalledError";
  }
}

// ==========================================================================
// Client types (from it2-client.ts)
// ==========================================================================

export interface It2Session {
  id: string;
  name: string;
  tabId: string;
  isAlive: boolean;
}

export interface It2Tab {
  id: string;
  windowId: string;
  index: number;
  sessions: number;
  isActive: boolean;
}

// ==========================================================================
// Client interface (from it2-client.ts)
// ==========================================================================

export interface IIt2Client {
  ping(): Promise<boolean>;
  listSessions(): Promise<It2Session[]>;
  listTabs(): Promise<It2Tab[]>;
  createTab(): Promise<string>;
  splitPane(sessionId: string): Promise<string>;
  closeSession(sessionId: string): Promise<void>;
  sendText(sessionId: string, text: string): Promise<void>;
  setBadge(sessionId: string, text: string): Promise<void>;
  setTabTitle(sessionId: string, title: string): Promise<void>;
  getSessionProperty(sessionId: string, property: string): Promise<string>;
}

// ==========================================================================
// Spawn function type (from it2-client.ts)
// ==========================================================================

/**
 * Spawn function signature matching the subset of Bun.spawn we need.
 * Accepts [cmd, ...args] and returns an object with stdout, stderr streams
 * and an exited promise.
 */
export type SpawnFn = (
  cmd: string[],
  opts: { stdout: "pipe"; stderr: "pipe" },
) => {
  stdout: ReadableStream | null;
  stderr: ReadableStream | null;
  exited: Promise<number>;
};

// ==========================================================================
// Binary resolution (from it2-client.ts)
// ==========================================================================

/** Resolve the it2 binary path. Checks PATH via which(1). */
function resolveIt2Binary(): string {
  try {
    const proc = Bun.spawnSync(["which", "it2"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    if (proc.exitCode === 0) return "it2";
  } catch {
    // which not available or failed
  }
  return "it2"; // let it fail at exec time
}

let _resolvedBinary: string | null = null;
function it2Binary(): string {
  if (_resolvedBinary === null) _resolvedBinary = resolveIt2Binary();
  return _resolvedBinary;
}

// ==========================================================================
// Client implementation (from it2-client.ts)
// ==========================================================================

export class It2Client implements IIt2Client {
  private timeoutMs: number;
  private spawnFn: SpawnFn;

  constructor(opts?: { timeoutMs?: number; spawn?: SpawnFn }) {
    this.timeoutMs = opts?.timeoutMs ?? 10_000;
    this.spawnFn =
      opts?.spawn ?? ((cmd, spawnOpts) => Bun.spawn(cmd, spawnOpts));
  }

  async ping(): Promise<boolean> {
    try {
      await this.exec(["session", "list"]);
      return true;
    } catch {
      return false;
    }
  }

  async listSessions(): Promise<It2Session[]> {
    try {
      const stdout = await this.exec(["session", "list", "--json"]);
      const parsed = JSON.parse(stdout);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((s: Record<string, unknown>) => ({
        id: String(s.id ?? ""),
        name: String(s.name ?? ""),
        tabId: String(s.tab_id ?? ""),
        isAlive: true, // sessions returned by list are alive
      }));
    } catch {
      return [];
    }
  }

  async listTabs(): Promise<It2Tab[]> {
    try {
      const stdout = await this.exec(["tab", "list", "--json"]);
      const parsed = JSON.parse(stdout);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((t: Record<string, unknown>) => ({
        id: String(t.id ?? ""),
        windowId: String(t.window_id ?? ""),
        index: Number(t.index ?? 0),
        sessions: Number(t.sessions ?? 0),
        isActive: Boolean(t.is_active ?? false),
      }));
    } catch {
      return [];
    }
  }

  async createTab(): Promise<string> {
    // Snapshot sessions before creating tab
    const before = await this.listSessions();
    const beforeIds = new Set(before.map((s) => s.id));

    // Create the tab
    const stdout = await this.exec(["tab", "new"]);

    // Parse the tab ID from "Created new tab: {tabId}"
    const match = stdout.match(/Created new tab:\s*(\S+)/);
    const tabId = match?.[1];
    if (!tabId) {
      throw new It2Error(`Failed to parse tab ID from: ${stdout.trim()}`);
    }

    // Find the new session in this tab
    const after = await this.listSessions();
    const newSession = after.find(
      (s) => s.tabId === tabId && !beforeIds.has(s.id),
    );
    if (!newSession) {
      throw new It2Error(
        `Created tab ${tabId} but could not find its session`,
      );
    }

    return newSession.id;
  }

  async splitPane(sessionId: string): Promise<string> {
    const stdout = await this.exec([
      "session",
      "split",
      "-v",
      "-s",
      sessionId,
    ]);
    // Parse "Created new pane: {sessionId}"
    const match = stdout.match(/Created new pane:\s*(\S+)/);
    if (match) return match[1];
    return stdout.trim();
  }

  async closeSession(sessionId: string): Promise<void> {
    try {
      await this.exec(["session", "close", "-f", "-s", sessionId]);
    } catch (err) {
      if (err instanceof It2ConnectionError) throw err;
      if (err instanceof It2Error && /not.found/i.test(err.message)) return;
      throw err;
    }
  }

  async sendText(sessionId: string, text: string): Promise<void> {
    await this.exec(["session", "run", "-s", sessionId, text]);
  }

  async setBadge(sessionId: string, text: string): Promise<void> {
    await this.exec([
      "session",
      "set-var",
      "-s",
      sessionId,
      "user.badge",
      text,
    ]);
  }

  async setTabTitle(sessionId: string, title: string): Promise<void> {
    await this.exec(["session", "set-name", "-s", sessionId, title]);
  }

  async getSessionProperty(
    sessionId: string,
    property: string,
  ): Promise<string> {
    const stdout = await this.exec([
      "session",
      "get-var",
      "-s",
      sessionId,
      property,
    ]);
    return stdout.trim();
  }

  private async exec(args: string[]): Promise<string> {
    let proc: ReturnType<SpawnFn>;
    try {
      proc = this.spawnFn([it2Binary(), ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new It2NotInstalledError();
      }
      throw new It2NotInstalledError("it2 binary not found");
    }

    const timeout = setTimeout(() => {
      if (
        "kill" in proc &&
        typeof (proc as { kill?: () => void }).kill === "function"
      ) {
        (proc as { kill: () => void }).kill();
      }
    }, this.timeoutMs);

    try {
      const [stdout, stderr] = await Promise.all([
        proc.stdout
          ? new Response(proc.stdout as ReadableStream).text()
          : Promise.resolve(""),
        proc.stderr
          ? new Response(proc.stderr as ReadableStream).text()
          : Promise.resolve(""),
      ]);

      const exitCode = await proc.exited;
      clearTimeout(timeout);

      if (exitCode !== 0) {
        const msg =
          stderr.trim() ||
          stdout.trim() ||
          `it2 exited with code ${exitCode}`;
        if (
          msg.includes("not running") ||
          msg.includes("connection refused") ||
          msg.includes("Connection refused") ||
          msg.includes("not available")
        ) {
          throw new It2ConnectionError(msg);
        }
        if (msg.includes("not installed") || msg.includes("No such file")) {
          throw new It2NotInstalledError(msg);
        }
        throw new It2Error(msg);
      }

      return stdout;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof It2Error) throw err;
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new It2NotInstalledError();
      }
      throw new It2Error((err as Error).message);
    }
  }
}

// ==========================================================================
// Availability helper (from it2-client.ts)
// ==========================================================================

/** Check if it2 is available by attempting to list sessions. */
export async function it2Available(): Promise<boolean> {
  const client = new It2Client({ timeoutMs: 3_000 });
  return client.ping();
}

// ==========================================================================
// Environment detection helper (from it2-client.ts)
// ==========================================================================

/** Check if we are running inside iTerm2. */
export function isInsideITerm2(): boolean {
  return !!(
    process.env.ITERM_SESSION_ID && process.env.TERM_PROGRAM === "iTerm.app"
  );
}

// ==========================================================================
// Session factory (from it2-session.ts)
// ==========================================================================

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
  async reconcile(projectRoot?: string): Promise<void> {
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
        // Check manifest — if epic is done/cancelled, close instead of adopting
        if (projectRoot) {
          const manifest = store.load(projectRoot, epicSlug);
          if (manifest && (manifest.phase === "done" || manifest.phase === "cancelled")) {
            try {
              await this.client.closeSession(session.id);
            } catch {
              // best-effort
            }
            continue;
          }
        }
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
    await this.reconcile(projectRoot);

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

  async setBadgeOnContainer(epicSlug: string, text: string): Promise<void> {
    const tabSessionId = this.tabs.get(epicSlug);
    if (!tabSessionId) return;
    await this.client.setBadge(tabSessionId, text);
  }

  // -------------------------------------------------------------------------
  // Private methods — shared artifact-watching logic
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
