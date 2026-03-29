/**
 * CmuxSession — cmux-aware dispatch strategy.
 *
 * Creates terminal surfaces in cmux for visual agent monitoring.
 * Completion is detected externally via runs.json polling.
 */

import type { ICmuxClient } from "./cmux-client.js";
import type { SessionResult } from "./watch-types.js";

export interface CmuxSessionOptions {
  /** The cmux client to use for all operations. */
  client: ICmuxClient;
  /** Epic slug — becomes the workspace name. */
  epicSlug: string;
  /** Phase being executed (design, plan, implement, validate, release). */
  phase: string;
  /** Feature slug for implement fan-out. */
  featureSlug?: string;
  /** Worktree slug used for cwd. */
  worktreeSlug: string;
  /** Project root path. */
  projectRoot: string;
}

export interface CmuxSessionHandle {
  /** Unique session ID. */
  id: string;
  /** Epic slug. */
  epicSlug: string;
  /** Phase being executed. */
  phase: string;
  /** Feature slug (for fan-out). */
  featureSlug?: string;
  /** Worktree slug. */
  worktreeSlug: string;
  /** AbortController for cancellation. */
  abortController: AbortController;
  /** Promise that resolves when the session completes. */
  promise: Promise<SessionResult>;
  /** Timestamp when dispatched. */
  startedAt: number;
  /** Resolve the session promise externally (called by watch loop on runs.json match). */
  complete: (result: SessionResult) => void;
  /** Workspace name in cmux. */
  workspace: string;
  /** Surface name in cmux. */
  surface: string;
}

export class CmuxSession {
  private client: ICmuxClient;

  constructor(client: ICmuxClient) {
    this.client = client;
  }

  /**
   * Dispatch a phase to a cmux surface.
   *
   * Creates workspace (idempotent), creates surface, sends the beastmode
   * command, and returns a handle. The promise resolves when `complete()`
   * is called externally (by the watch loop when it detects a matching
   * runs.json entry).
   */
  async dispatch(options: CmuxSessionOptions): Promise<CmuxSessionHandle> {
    const {
      epicSlug,
      phase,
      featureSlug,
      worktreeSlug,
    } = options;

    const workspace = epicSlug;
    const surface = featureSlug ? `${phase}-${featureSlug}` : phase;
    const id = `cmux-${worktreeSlug}-${Date.now()}`;

    // 1. Ensure workspace exists (idempotent)
    await this.client.createWorkspace(workspace);

    // 2. Create surface
    await this.client.createSurface(workspace, surface);

    // 3. Build the command
    const args = featureSlug
      ? `${epicSlug} ${featureSlug}`
      : epicSlug;
    const command = `beastmode run ${phase} ${args}`;

    // 4. Send command into the surface
    await this.client.sendText(workspace, surface, command);

    // 5. Set up completion promise (resolved externally)
    let resolvePromise!: (result: SessionResult) => void;
    const promise = new Promise<SessionResult>((resolve) => {
      resolvePromise = resolve;
    });

    // 6. Wire abort handler
    const abortController = new AbortController();
    const startedAt = Date.now();
    const onAbort = async () => {
      try {
        await this.client.closeSurface(workspace, surface);
      } catch {
        // Best-effort cleanup
      }
      resolvePromise({
        success: false,
        exitCode: 130, // SIGINT convention
        costUsd: 0,
        durationMs: Date.now() - startedAt,
      });
    };
    abortController.signal.addEventListener("abort", () => {
      void onAbort();
    });

    return {
      id,
      epicSlug,
      phase,
      featureSlug,
      worktreeSlug,
      abortController,
      promise,
      startedAt,
      complete: resolvePromise,
      workspace,
      surface,
    };
  }

  /**
   * Clean up a workspace and all its surfaces.
   * Called when an epic reaches release.
   */
  async cleanup(epicSlug: string): Promise<void> {
    try {
      await this.client.closeWorkspace(epicSlug);
    } catch {
      // Best-effort — workspace may already be gone
    }
  }
}
