/**
 * Dispatch tracker — manages active SDK sessions for the watch loop.
 *
 * Tracks which epics/features have active sessions to avoid double-dispatch.
 * Provides completion callbacks for event-driven re-scanning.
 *
 * Moved from: dispatch-tracker.ts
 */

import type { DispatchedSession, SessionResult } from "./types.js";

export class DispatchTracker {
  private sessions = new Map<string, DispatchedSession>();
  /** Reservations prevent duplicate dispatch during async session creation. */
  private reserved = new Set<string>();

  /** Register a new dispatched session and clear its reservation. */
  add(session: DispatchedSession): void {
    this.sessions.set(session.id, session);
    this.reserved.delete(this.reservationKey(session));
  }

  /** Remove a completed session by ID. */
  remove(id: string): void {
    this.sessions.delete(id);
  }

  /** Check if a session with the given ID exists. */
  has(id: string): boolean {
    return this.sessions.has(id);
  }

  /**
   * Reserve a dispatch slot synchronously before the async session create.
   * Prevents concurrent rescans from dispatching the same feature/phase.
   */
  reserve(epicSlug: string, phase: string, featureSlug?: string): void {
    this.reserved.add(this.reserveKey(epicSlug, phase, featureSlug));
  }

  /** Release a reservation (on create failure). */
  unreserve(epicSlug: string, phase: string, featureSlug?: string): void {
    this.reserved.delete(this.reserveKey(epicSlug, phase, featureSlug));
  }

  private reserveKey(epicSlug: string, phase: string, featureSlug?: string): string {
    return featureSlug ? `${epicSlug}:${phase}:${featureSlug}` : `${epicSlug}:${phase}`;
  }

  private reservationKey(session: DispatchedSession): string {
    return this.reserveKey(session.epicSlug, session.phase, session.featureSlug);
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

  /** Check if a specific feature dispatch is already running or reserved. */
  hasFeatureSession(epicSlug: string, featureSlug: string): boolean {
    if (this.reserved.has(this.reserveKey(epicSlug, "implement", featureSlug))) return true;
    for (const s of this.sessions.values()) {
      if (s.epicSlug === epicSlug && s.featureSlug === featureSlug) return true;
    }
    return false;
  }

  /**
   * Check if an epic has an active or reserved session for a specific phase.
   */
  hasPhaseSession(epicSlug: string, phase: string): boolean {
    if (this.reserved.has(this.reserveKey(epicSlug, phase))) return true;
    for (const s of this.sessions.values()) {
      if (s.epicSlug === epicSlug && s.phase === phase) return true;
    }
    return false;
  }

  /**
   * Check if any non-feature session is using the shared epic worktree.
   * Plan, validate, and release all share one worktree per epic, so only
   * one can run at a time.
   */
  hasEpicWorktreeSession(epicSlug: string): boolean {
    for (const s of this.sessions.values()) {
      if (s.epicSlug === epicSlug && !s.featureSlug) return true;
    }
    return false;
  }

  /**
   * Check if ANY active session or reservation is for the release phase.
   * Used by the watch loop to serialize releases — only one at a time.
   */
  hasAnyReleaseSession(): boolean {
    for (const key of this.reserved) {
      if (key.endsWith(":release")) return true;
    }
    for (const s of this.sessions.values()) {
      if (s.phase === "release") return true;
    }
    return false;
  }

  /**
   * Check if any active session is running a release phase.
   * Used for release serialization — only one release at a time.
   * Returns the epic slug of the blocking release, or null if none.
   */
  getActiveReleaseSlug(): string | null {
    for (const s of this.sessions.values()) {
      if (s.phase === 'release') return s.epicSlug;
    }
    return null;
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
