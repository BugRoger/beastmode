/**
 * Shared types for the beastmode CLI.
 */

/** Valid beastmode workflow phases */
export type Phase = "design" | "plan" | "implement" | "validate" | "release" | "done" | "cancelled";

/** Valid top-level CLI commands: phases + utilities */
export type Command = Phase | "watch" | "status" | "cancel" | "compact" | "dashboard" | "store" | "hooks" | "help";

/** Result from a phase execution */
export interface PhaseResult {
  exit_status: "success" | "error" | "cancelled";
  duration_ms: number;
  session_id: string | null;
}

/** Phase-specific artifact shapes for output files */
export interface DesignArtifacts {
  design: string; // path to PRD
  slug?: string;  // real slug from PRD frontmatter (for post-dispatch rename)
  epic?: string;  // human-readable epic name from standardized frontmatter
  summary?: { problem: string; solution: string };
}

export interface PlanArtifacts {
  features: Array<{ slug: string; plan: string; description?: string; wave?: number }>;
}

export interface ImplementArtifacts {
  features: Array<{ slug: string; status: "completed" | "blocked" }>;
  deviations?: string; // path to deviations log
}

export interface ValidateArtifacts {
  report: string; // path to validation report
  passed: boolean;
  failedFeatures?: string[];
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
 * Written by skill checkpoints to state/<phase>/YYYY-MM-DD-<slug>.output.json
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

export function isValidPhase(s: string): s is Phase {
  return (VALID_PHASES as readonly string[]).includes(s);
}
