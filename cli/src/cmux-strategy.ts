/**
 * cmux strategy — dispatches phase sessions to cmux terminal surfaces.
 *
 * Delegates to CmuxSessionFactory for surface creation and marker-file
 * based completion detection. Maintains a workspace-per-epic map for cleanup.
 */

import type { SessionStrategy, DispatchOptions, DispatchHandle } from "./session-strategy.js";
import type { ICmuxClient } from "./cmux-client.js";
import { CmuxSessionFactory } from "./cmux-session.js";

export class CmuxStrategy implements SessionStrategy {
  private client: ICmuxClient;
  private factory: CmuxSessionFactory;
  private completedIds = new Set<string>();
  /** Maps epic slugs to cmux workspace names. */
  private workspaceMap = new Map<string, string>();

  constructor(client: ICmuxClient, opts?: { watchTimeoutMs?: number }) {
    this.client = client;
    this.factory = new CmuxSessionFactory(client, opts);
  }

  /**
   * Register an existing workspace for an epic.
   * Used by startup reconciliation to adopt workspaces from a previous session.
   */
  registerWorkspace(epicSlug: string, workspaceName: string): void {
    this.workspaceMap.set(epicSlug, workspaceName);
  }

  /**
   * Get the workspace name for an epic, if registered.
   */
  getWorkspace(epicSlug: string): string | undefined {
    return this.workspaceMap.get(epicSlug);
  }

  /**
   * Dispatch a phase session to a cmux surface.
   * Delegates to CmuxSessionFactory which handles workspace/surface lifecycle
   * and marker-file based completion detection.
   */
  async dispatch(opts: DispatchOptions): Promise<DispatchHandle> {
    const handle = await this.factory.create(opts);

    // Track workspace for this epic
    const workspaceName = `bm-${opts.epicSlug}`;
    this.workspaceMap.set(opts.epicSlug, workspaceName);

    // Wrap promise to track completion
    const trackedPromise = handle.promise.then((result) => {
      this.completedIds.add(handle.id);
      return result;
    });

    return {
      id: handle.id,
      worktreeSlug: handle.worktreeSlug,
      promise: trackedPromise,
    };
  }

  /**
   * Check if a session has completed.
   */
  isComplete(id: string): boolean {
    return this.completedIds.has(id);
  }

  /**
   * Clean up cmux resources for an epic.
   * Delegates to factory cleanup (closes workspace and surfaces),
   * then falls back to direct workspace close for registered workspaces.
   * Best-effort: catches all errors, logs warnings, never throws.
   */
  async cleanup(epicSlug: string): Promise<void> {
    // Try factory cleanup first (handles internal workspace tracking)
    try {
      await this.factory.cleanup(epicSlug);
    } catch (err) {
      console.warn(`[cmux] cleanup: factory cleanup failed for ${epicSlug}:`, err);
    }

    // Also try direct workspace close for manually registered workspaces
    const workspaceName = this.workspaceMap.get(epicSlug);
    if (workspaceName) {
      try {
        await this.client.closeWorkspace(workspaceName);
        console.log(`[cmux] cleanup: closed workspace ${workspaceName} for ${epicSlug}`);
      } catch (err) {
        // Best-effort — log and continue.
        console.warn(`[cmux] cleanup: failed to close workspace ${workspaceName} for ${epicSlug}:`, err);
      }

      this.workspaceMap.delete(epicSlug);
    }
  }
}
