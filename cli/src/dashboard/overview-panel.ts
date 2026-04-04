import type { EnrichedManifest } from "../manifest/store.js";

export type Phase = "design" | "plan" | "implement" | "validate" | "release" | "done" | "cancelled";

const ALL_PHASES: Phase[] = ["design", "plan", "implement", "validate", "release", "done", "cancelled"];

export interface PhaseCount {
  phase: Phase;
  count: number;
}

/**
 * Count epics per phase. Returns only phases with count > 0,
 * in canonical phase order.
 */
export function computePhaseDistribution(epics: EnrichedManifest[]): PhaseCount[] {
  const counts = new Map<string, number>();
  for (const epic of epics) {
    counts.set(epic.phase, (counts.get(epic.phase) ?? 0) + 1);
  }
  return ALL_PHASES
    .filter((p) => (counts.get(p) ?? 0) > 0)
    .map((p) => ({ phase: p, count: counts.get(p)! }));
}

export interface GitStatus {
  branch: string;
  dirty: boolean;
}

/**
 * Format git status for display.
 */
export function formatGitStatus(status: GitStatus): string {
  return `${status.branch} (${status.dirty ? "dirty" : "clean"})`;
}

/**
 * Format active sessions for display.
 */
export function formatActiveSessions(count: number): string {
  return `${count} active session${count !== 1 ? "s" : ""} / ${count} worktree${count !== 1 ? "s" : ""}`;
}
