/**
 * Cmux-based session factory — dispatches phases into cmux terminal surfaces.
 *
 * Creates one workspace per epic, one surface per dispatched phase/feature.
 * Completion is detected via fs.watch on .dispatch-done.json marker files.
 */

import { watch, type FSWatcher } from "node:fs";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ICmuxClient } from "./cmux-client.js";
import type {
  SessionFactory,
  SessionCreateOpts,
  SessionHandle,
} from "./session.js";
import type { SessionResult } from "./watch-types.js";

/** Marker file written by phaseCommand on exit. */
export interface DispatchDoneMarker {
  exitCode: number;
  costUsd: number;
  durationMs: number;
  error?: string;
  gateBlocked?: boolean;
}

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

    // Derive worktree path where marker will appear
    const worktreePath = resolve(
      projectRoot,
      ".claude",
      "worktrees",
      worktreeSlug,
    );
    const markerPath = resolve(worktreePath, ".dispatch-done.json");

    // Set up promise that resolves when marker file appears
    const startTime = Date.now();
    const promise = this.watchForMarker(id, markerPath, startTime, opts.signal);

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

  /** Watch for the .dispatch-done.json marker file. */
  private watchForMarker(
    sessionId: string,
    markerPath: string,
    startTime: number,
    signal: AbortSignal,
  ): Promise<SessionResult> {
    return new Promise<SessionResult>((resolvePromise, rejectPromise) => {
      // Check if marker already exists (race condition guard)
      if (existsSync(markerPath)) {
        const result = this.readMarker(markerPath, startTime);
        if (result) {
          resolvePromise(result);
          return;
        }
      }

      // Watch the directory for the marker file
      const dir = resolve(markerPath, "..");
      let watcher: FSWatcher;

      const cleanup = () => {
        this.cleanupWatcher(sessionId);
        clearTimeout(timeout);
      };

      try {
        watcher = watch(dir, (_eventType, filename) => {
          if (filename === ".dispatch-done.json") {
            const result = this.readMarker(markerPath, startTime);
            if (result) {
              cleanup();
              resolvePromise(result);
            }
          }
        });
        this.watchers.set(sessionId, watcher);
      } catch {
        // Directory might not exist yet — fall back to polling
        const pollInterval = setInterval(() => {
          if (existsSync(markerPath)) {
            clearInterval(pollInterval);
            clearTimeout(timeout);
            const result = this.readMarker(markerPath, startTime);
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

        // Handle abort
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

  /** Read and parse the dispatch-done marker file. */
  private readMarker(
    markerPath: string,
    startTime: number,
  ): SessionResult | null {
    try {
      const raw = readFileSync(markerPath, "utf-8");
      const marker: DispatchDoneMarker = JSON.parse(raw);
      return {
        success: marker.exitCode === 0,
        exitCode: marker.exitCode,
        costUsd: marker.costUsd ?? 0,
        durationMs: marker.durationMs ?? Date.now() - startTime,
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
