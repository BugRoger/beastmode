/**
 * Shared types for the beastmode CLI.
 */

/** Valid beastmode workflow phases */
export type Phase = "design" | "plan" | "implement" | "validate" | "release";

/** Valid top-level CLI commands */
export type Command = "run" | "watch" | "status";

/** Parsed CLI arguments for the run command */
export interface RunArgs {
  phase: Phase;
  /** Remaining positional args after the phase (e.g., slug, topic) */
  args: string[];
}

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

export const VALID_PHASES: readonly Phase[] = [
  "design",
  "plan",
  "implement",
  "validate",
  "release",
] as const;

export function isValidPhase(s: string): s is Phase {
  return (VALID_PHASES as readonly string[]).includes(s);
}
