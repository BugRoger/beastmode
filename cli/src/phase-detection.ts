/**
 * Phase detection — classifies a phase command request relative to manifest state.
 *
 * Runs early in the phase command, after manifest load but before worktree
 * creation. Gates entry to the normal dispatch path.
 *
 * Detection matrix:
 *   requested < current  → regression
 *   requested == current (tag exists) → same-phase rerun
 *   requested == current (no tag)     → normal forward
 *   requested > current  → forward jump (blocked)
 */

import type { Phase } from "./types";
import { PHASE_ORDER, phaseIndex } from "./types";
import { tagName, deleteTags } from "./phase-tags";
import { git } from "./git";

/** Classification of a phase request against manifest state. */
export type PhaseRequestType = "normal" | "same-rerun" | "regression" | "forward-jump";

export interface PhaseClassification {
  type: PhaseRequestType;
  /** The predecessor phase to reset to (only set for regression/same-rerun). */
  predecessorPhase?: Phase;
  /** The tag to reset to (only set for regression/same-rerun). */
  resetTag?: string;
}

/**
 * Get the predecessor phase in the workflow order.
 * Returns undefined for "design" (no predecessor) and "plan" returns "design".
 */
export function predecessorOf(phase: Phase): Phase | undefined {
  const idx = phaseIndex(phase);
  if (idx <= 0) return undefined;
  return PHASE_ORDER[idx - 1];
}

/**
 * Classify a phase request against the manifest's current phase.
 *
 * For same-phase reruns: the predecessor is the phase before the current one.
 * For regression: the predecessor is the phase before the requested one.
 */
export function classifyPhaseRequest(
  requested: Phase,
  manifestPhase: Phase,
): PhaseClassification {
  const reqIdx = phaseIndex(requested);
  const curIdx = phaseIndex(manifestPhase);

  // Terminal or unknown phases can't be requested
  if (reqIdx < 0 || curIdx < 0) {
    return { type: "forward-jump" };
  }

  if (reqIdx > curIdx) {
    return { type: "forward-jump" };
  }

  if (reqIdx < curIdx) {
    const pred = predecessorOf(requested);
    return {
      type: "regression",
      predecessorPhase: pred,
    };
  }

  // reqIdx === curIdx — same-phase rerun or normal forward
  // Caller determines which by checking for tag existence
  const pred = predecessorOf(requested);
  return {
    type: "same-rerun",
    predecessorPhase: pred,
  };
}

/**
 * Check whether the predecessor tag exists for a given slug and phase.
 * Returns the tag name if it exists, undefined otherwise.
 */
export async function findPredecessorTag(
  slug: string,
  predecessorPhase: Phase,
  opts: { cwd?: string } = {},
): Promise<string | undefined> {
  const tag = tagName(slug, predecessorPhase);
  const result = await git(["rev-parse", "--verify", tag], {
    cwd: opts.cwd,
    allowFailure: true,
  });
  if (result.exitCode === 0) return tag;
  return undefined;
}

/**
 * Check whether the phase's own tag exists (indicating a prior run).
 * Used to distinguish normal forward from same-phase rerun.
 */
export async function hasPhaseTag(
  slug: string,
  phase: Phase,
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const tag = tagName(slug, phase);
  const result = await git(["rev-parse", "--verify", tag], {
    cwd: opts.cwd,
    allowFailure: true,
  });
  return result.exitCode === 0;
}

/**
 * Execute a regression reset: delete downstream tags, reset branch to
 * predecessor tag, return the reset SHA.
 *
 * Crash-safe ordering: delete downstream tags → git reset → return.
 * Missing tags are harmless; next successful phase recreates them.
 */
export async function executeRegression(opts: {
  slug: string;
  predecessorPhase: Phase;
  resetTag: string;
  cwd?: string;
}): Promise<{ resetSha: string }> {
  // 1. Delete downstream tags (after predecessor phase)
  await deleteTags(opts.slug, opts.predecessorPhase, { cwd: opts.cwd });

  // 2. Hard reset to the predecessor tag
  await git(["reset", "--hard", opts.resetTag], { cwd: opts.cwd });
  const sha = (await git(["rev-parse", "HEAD"], { cwd: opts.cwd })).stdout;

  return { resetSha: sha };
}

/**
 * Format a human-readable description of what will be lost on regression.
 */
export function formatRegressionWarning(
  _slug: string,
  currentPhase: Phase,
  targetPhase: Phase,
  resetTag: string,
): string {
  const curIdx = phaseIndex(currentPhase);
  const targetIdx = phaseIndex(targetPhase);

  const lostPhases = PHASE_ORDER.slice(targetIdx, curIdx + 1);
  const phaseList = lostPhases.join(", ");

  return [
    `Regression: ${currentPhase} → ${targetPhase}`,
    `This will reset to tag ${resetTag} and discard commits from: ${phaseList}`,
    `All work in those phases will be lost.`,
  ].join("\n");
}
