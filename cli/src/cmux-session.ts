/**
 * Cmux-based session factory — dispatches phases into cmux terminal surfaces.
 *
 * Creates one workspace per epic, one surface per dispatched phase/feature.
 * Completion is detected via fs.watch on *.output.json files in
 * .beastmode/artifacts/<phase>/.
 */

import { watch, type FSWatcher } from "node:fs";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ICmuxClient } from "./cmux-client.js";
import type {
  SessionFactory,
  SessionCreateOpts,
  SessionHandle,
} from "./session.js";
import type { SessionResult } from "./watch-types.js";

export class CmuxSessionFactory implements SessionFactory {
  private client: ICmuxClient;
  private workspaces = new Map<string, string>(); // epicSlug -> workspace name
  private watchers = new Map<string, FSWatcher>(); // session id -> fs watcher
  private watchTimeoutMs: number;

  constructor(client: ICmuxClient, opts?: { watchTimeoutMs?: number }) {
    this.client = client;
    this.watchTimeoutMs = opts?.watchTimeoutMs ?? 600_000; // 10 min default
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    const { epicSlug, phase, featureSlug, args, projectRoot } = opts;

    // Derive workspace + surface names
    const workspaceName = `bm-${epicSlug}`;
    const surfaceName = featureSlug ? `${phase}-${featureSlug}` : phase;
    const worktreeSlug = featureSlug
      ? `${epicSlug}-${featureSlug}`
      : epicSlug;
    const id = `cmux-${worktreeSlug}-${Date.now()}`;

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

    // Build and send the beastmode command
    const command = `beastmode ${phase} ${args.join(" ")}`;
    await this.client.sendText(workspaceName, surfaceName, command);

    // Derive artifact directory where output.json will appear
    const worktreePath = resolve(
      projectRoot,
      ".claude",
      "worktrees",
      worktreeSlug,
    );
    const artifactDir = resolve(worktreePath, ".beastmode", "artifacts", opts.phase);

    // Set up promise that resolves when output.json appears
    const startTime = Date.now();
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
      // Check if an output.json already exists
      const existing = this.findOutputJson(artifactDir);
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
          const found = this.findOutputJson(artifactDir);
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

  /** Find an output.json file in the artifact directory. */
  private findOutputJson(dir: string): string | null {
    try {
      const files = readdirSync(dir) as string[];
      const match = files
        .filter((f: string) => f.endsWith(".output.json"))
        .sort()
        .pop();
      return match ? resolve(dir, match) : null;
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
