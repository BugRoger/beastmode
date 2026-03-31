/**
 * Shared types for the beastmode CLI.
 */

/** Valid beastmode workflow phases */
export type Phase = "design" | "plan" | "implement" | "validate" | "release" | "done" | "cancelled";

/** Valid top-level CLI commands: phases + utilities */
export type Command = Phase | "watch" | "status" | "cancel" | "compact" | "help";

/** A single entry in .beastmode-runs.json */
export interface RunLogEntry {
  epic: string | null;
  phase: Phase;
  feature: string | null;
  cost_usd: number | null;
  duration_ms: number;
  exit_status: "success" | "error" | "cancelled";
  timestamp: string;
  session_id: string | null;
}

/** Result from a phase execution */
export interface PhaseResult {
  exit_status: "success" | "error" | "cancelled";
  cost_usd: number | null;
  duration_ms: number;
  session_id: string | null;
}

/** Phase-specific artifact shapes for output files */
export interface DesignArtifacts {
  design: string; // path to PRD
  slug?: string;  // real slug from PRD frontmatter (for post-dispatch rename)
}

export interface PlanArtifacts {
  features: Array<{ slug: string; plan: string }>;
}

export interface ImplementArtifacts {
  features: Array<{ slug: string; status: "completed" | "blocked" }>;
  deviations?: string; // path to deviations log
}

export interface ValidateArtifacts {
  report: string; // path to validation report
  passed: boolean;
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

export function isValidPhase(s: string): s is Phase {
  return (VALID_PHASES as readonly string[]).includes(s);
}
