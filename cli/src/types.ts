/**
 * Shared types for the beastmode CLI.
 */

/** Valid beastmode workflow phases */
export type Phase = "design" | "plan" | "implement" | "validate" | "release" | "done" | "cancelled";

/** Valid top-level CLI commands: phases + utilities */
export type Command = Phase | "cancel" | "compact" | "dashboard" | "store" | "hooks" | "help";

/** Result from a phase execution */
export interface PhaseResult {
  exit_status: "success" | "error" | "cancelled";
  duration_ms: number;
  session_id: string | null;
}

/** Phase-specific artifact shapes for output files */
export interface DesignArtifacts {
  design: string; // path to PRD
  "epic-slug"?: string; // skill-proposed epic name from frontmatter
}

export interface PlanArtifacts {
  features: Array<{ "feature-slug": string; plan: string; wave?: number }>;
}

export interface ImplementArtifacts {
  features: Array<{ "feature-slug": string; status: "completed" | "blocked" }>;
  deviations?: string; // path to deviations log
}

export interface ValidateArtifacts {
  report: string; // path to validation report
  passed: boolean;
  "failed-features"?: string[];
}

export interface ReleaseArtifacts {
  version: string;
  changelog?: string; // path to changelog
}

/** Union of all phase artifact shapes */
export type PhaseArtifacts =
  | DesignArtifacts
  | PlanArtifacts
  | ImplementArtifacts
  | ValidateArtifacts
  | ReleaseArtifacts;

/** Universal phase output contract.
 * Written by skill checkpoints to state/<phase>/YYYY-MM-DD-<id>.output.json
 * Read by CLI to enrich manifests.
 */
export interface PhaseOutput {
  status: "completed" | "error" | "cancelled";
  artifacts: PhaseArtifacts;
}

export const VALID_PHASES: readonly Phase[] = [
  "design",
  "plan",
  "implement",
  "validate",
  "release",
  "done",
  "cancelled",
] as const;

/** Phase ordering for regression detection. Only workflow phases included. */
export const PHASE_ORDER: readonly Phase[] = [
  "design",
  "plan",
  "implement",
  "validate",
  "release",
] as const;

/** Get the zero-based index of a phase in the workflow order. Returns -1 for terminal phases. */
export function phaseIndex(phase: Phase): number {
  return (PHASE_ORDER as readonly string[]).indexOf(phase);
}

/** Check whether `current` phase is at or past `threshold` in the workflow progression.
 *  Terminal phases (done, cancelled) are considered past all workflow phases.
 *  If threshold is a terminal phase, only terminal phases satisfy it. */
export function isPhaseAtOrPast(current: Phase, threshold: Phase): boolean {
  const currentIdx = phaseIndex(current);
  const thresholdIdx = phaseIndex(threshold);

  // Both terminal — always true (done/cancelled are interchangeable for ordering)
  if (currentIdx === -1 && thresholdIdx === -1) return true;

  // Current is terminal, threshold is workflow — terminal is past everything
  if (currentIdx === -1) return true;

  // Threshold is terminal, current is workflow — workflow never reaches terminal
  if (thresholdIdx === -1) return false;

  // Both workflow — compare indices
  return currentIdx >= thresholdIdx;
}

export function isValidPhase(s: string): s is Phase {
  return (VALID_PHASES as readonly string[]).includes(s);
}
