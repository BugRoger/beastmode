/**
 * Dispatch tracker — manages active SDK sessions for the watch loop.
 *
 * Tracks which epics/features have active sessions to avoid double-dispatch.
 * Provides completion callbacks for event-driven re-scanning.
 */

import type { DispatchedSession, SessionResult } from "./watch-types.js";

export class DispatchTracker {
  private sessions = new Map<string, DispatchedSession>();

  /** Register a new dispatched session. */
  add(session: DispatchedSession): void {
    this.sessions.set(session.id, session);
  }

  /** Remove a completed session by ID. */
  remove(id: string): void {
    this.sessions.delete(id);
  }

  /** Get all active sessions. */
  getAll(): DispatchedSession[] {
    return Array.from(this.sessions.values());
  }

  /** Check if an epic has any active sessions. */
  hasActiveSession(epicSlug: string): boolean {
    for (const s of this.sessions.values()) {
      if (s.epicSlug === epicSlug) return true;
    }
    return false;
  }

  /** Check if a specific feature dispatch is already running. */
  hasFeatureSession(epicSlug: string, featureSlug: string): boolean {
    for (const s of this.sessions.values()) {
      if (s.epicSlug === epicSlug && s.featureSlug === featureSlug) return true;
    }
    return false;
  }

  /**
   * Check if an epic has an active session for a non-implement phase.
   * (Implement fan-out allows multiple sessions per epic.)
   */
  hasPhaseSession(epicSlug: string, phase: string): boolean {
    for (const s of this.sessions.values()) {
      if (s.epicSlug === epicSlug && s.phase === phase) return true;
    }
    return false;
  }

  /** Number of active sessions. */
  get size(): number {
    return this.sessions.size;
  }

  /** Cancel all active sessions (for graceful shutdown). */
  abortAll(): void {
    for (const session of this.sessions.values()) {
      session.abortController.abort();
    }
  }

  /**
   * Wait for all active sessions to complete (with timeout).
   * Returns results for each session.
   */
  async waitAll(
    timeoutMs: number = 30_000,
  ): Promise<Map<string, SessionResult | null>> {
    const results = new Map<string, SessionResult | null>();

    const entries = Array.from(this.sessions.entries());
    if (entries.length === 0) return results;

    const timeout = new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), timeoutMs),
    );

    const settled = await Promise.race([
      Promise.allSettled(
        entries.map(async ([id, session]) => {
          const result = await session.promise;
          results.set(id, result);
        }),
      ),
      timeout,
    ]);

    if (settled === "timeout") {
      // Set null for sessions that didn't complete
      for (const [id] of entries) {
        if (!results.has(id)) {
          results.set(id, null);
        }
      }
    }

    return results;
  }
}
