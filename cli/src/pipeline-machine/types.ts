import type { Phase } from "../types";
import type { ManifestFeature } from "../manifest-store";

// ── Epic (top-level pipeline unit) ──────────────────────────────

export interface EpicContext {
  slug: string;
  phase: Phase;
  features: ManifestFeature[];
  artifacts: Record<string, string[]>;
  worktree?: { branch: string; path: string };
  github?: { epic: number; repo: string };
  blocked?: { gate: string; reason: string } | null;
  lastUpdated: string;
}

export type EpicEvent =
  | { type: "DESIGN_COMPLETED"; realSlug?: string }
  | { type: "PLAN_COMPLETED"; features: Array<{ slug: string; plan: string }> }
  | { type: "FEATURE_COMPLETED"; featureSlug: string }
  | { type: "IMPLEMENT_COMPLETED" }
  | { type: "VALIDATE_COMPLETED" }
  | { type: "VALIDATE_FAILED" }
  | { type: "RELEASE_COMPLETED" }
  | { type: "CANCEL" };

// ── Feature (child work unit inside an epic) ────────────────────

export interface FeatureContext {
  slug: string;
  plan: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  github?: { issue: number };
}

export type FeatureEvent =
  | { type: "START" }
  | { type: "COMPLETE" }
  | { type: "BLOCK" }
  | { type: "UNBLOCK" }
  | { type: "RESET" };

// ── Dispatch strategy ───────────────────────────────────────────

export type DispatchType = "single" | "fan-out" | "skip";
