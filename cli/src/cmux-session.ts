/**
 * Cmux-based session factory — dispatches phases into cmux terminal surfaces.
 *
 * Creates one workspace per epic, one surface per dispatched phase/feature.
 * Completion is detected via fs.watch on *.output.json files in
 * .beastmode/artifacts/<phase>/.
 */

import { watch, type FSWatcher } from "node:fs";
import { readFileSync, readdirSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import type { ICmuxClient } from "./cmux-client.js";
import type {
  SessionFactory,
  SessionCreateOpts,
  SessionHandle,
} from "./session.js";
import type { SessionResult } from "./watch-types.js";
import * as worktree from "./worktree.js";

/** Function that creates a worktree and returns its info. */
export type CreateWorktreeFn = (
  slug: string,
  opts: { cwd: string },
) => Promise<{ path: string }>;

export class CmuxSessionFactory implements SessionFactory {
  private client: ICmuxClient;
  private createWorktree: CreateWorktreeFn;
  private workspaces = new Map<string, string>(); // epicSlug -> workspace name
  private watchers = new Map<string, FSWatcher>(); // session id -> fs watcher
  private watchTimeoutMs: number;

  constructor(
    client: ICmuxClient,
    opts?: { watchTimeoutMs?: number; createWorktree?: CreateWorktreeFn },
  ) {
    this.client = client;
    this.createWorktree = opts?.createWorktree ?? ((slug, o) => worktree.create(slug, o));
    this.watchTimeoutMs = opts?.watchTimeoutMs ?? 600_000; // 10 min default
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    const { epicSlug, phase, featureSlug, args, projectRoot } = opts;

    // Record start time before any setup — used to filter stale output.json files
    const startTime = Date.now();

    // Derive workspace + surface names
    const workspaceName = `bm-${epicSlug}`;
    const surfaceName = featureSlug ? `${phase}-${featureSlug}` : phase;
    // Always use the epic-level worktree — no per-feature worktrees
    const worktreeSlug = epicSlug;
    const id = `cmux-${worktreeSlug}-${Date.now()}`;

    // Create worktree (idempotent — worktree.create handles existing)
    const wt = await this.createWorktree(worktreeSlug, { cwd: projectRoot });

    // Ensure workspace exists (idempotent)
    if (!this.workspaces.has(epicSlug)) {
      try {
        await this.client.createWorkspace(workspaceName);
      } catch {
        // Workspace may already exist — that's fine
      }
      this.workspaces.set(epicSlug, workspaceName);
    }

    // Create surface
    await this.client.createSurface(workspaceName, surfaceName);

    // cd into the worktree, then run the beastmode command
    const command = `cd ${wt.path} && beastmode ${phase} ${args.join(" ")}`;
    await this.client.sendText(workspaceName, surfaceName, command);

    // Derive artifact directory where output.json will appear
    const artifactDir = resolve(wt.path, ".beastmode", "artifacts", opts.phase);

    // Clean stale output.json files — git checkout sets mtime to now,
    // which defeats the startTime filter and causes instant false matches.
    this.cleanStaleOutputFiles(artifactDir);

    // Set up promise that resolves when output.json appears
    const promise = this.watchForMarker(id, artifactDir, startTime, opts.signal);

    // Handle abort — close surface
    const onAbort = async () => {
      this.cleanupWatcher(id);
      try {
        await this.client.closeSurface(workspaceName, surfaceName);
      } catch {
        // best-effort
      }
    };
    opts.signal.addEventListener("abort", onAbort, { once: true });

    // Wrap promise to handle notifications
    const notifiedPromise = promise.then(async (result) => {
      opts.signal.removeEventListener("abort", onAbort);

      // Notify on failure or gate block
      if (!result.success) {
        try {
          await this.client.notify(
            `${epicSlug} — ${phase} failed`,
            `Exit code ${result.exitCode}`,
          );
        } catch {
          // best-effort notification
        }
      }

      // Clean up surface after completion
      try {
        await this.client.closeSurface(workspaceName, surfaceName);
      } catch {
        // best-effort
      }

      return result;
    });

    return { id, worktreeSlug, promise: notifiedPromise };
  }

  async cleanup(epicSlug: string): Promise<void> {
    const workspaceName = this.workspaces.get(epicSlug);
    if (!workspaceName) return;

    try {
      await this.client.closeWorkspace(workspaceName);
    } catch {
      // best-effort
    }
    this.workspaces.delete(epicSlug);
  }

  /** Watch for *.output.json files in the artifact directory. */
  private watchForMarker(
    sessionId: string,
    artifactDir: string,
    startTime: number,
    signal: AbortSignal,
  ): Promise<SessionResult> {
    return new Promise<SessionResult>((resolvePromise, rejectPromise) => {
      // Check if an output.json already exists that is newer than dispatch time.
      // Stale output.json files from previous runs must be ignored.
      const existing = this.findOutputJson(artifactDir, startTime);
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
          if (filename && filename.endsWith(".output.json")) {
            const filePath = resolve(artifactDir, filename);
            // Verify the file was written after dispatch, not a stale leftover
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
          }
        });
        this.watchers.set(sessionId, watcher);
      } catch {
        // Fall back to polling
        const pollInterval = setInterval(() => {
          const found = this.findOutputJson(artifactDir, startTime);
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

  /** Find an output.json file in the artifact directory, optionally filtering by mtime. */
  private findOutputJson(dir: string, newerThanMs?: number): string | null {
    try {
      const files = readdirSync(dir) as string[];
      const candidates = files
        .filter((f: string) => f.endsWith(".output.json"))
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

  /** Remove pre-existing output.json files to prevent stale matches after git checkout. */
  private cleanStaleOutputFiles(dir: string): void {
    try {
      const files = readdirSync(dir);
      for (const f of files) {
        if (f.endsWith(".output.json")) {
          unlinkSync(resolve(dir, f));
        }
      }
    } catch {
      // Directory doesn't exist yet — nothing to clean
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
