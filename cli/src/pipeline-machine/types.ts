import type { Phase } from "../types";
import type { ManifestFeature } from "../manifest/store";

// ── Epic (top-level pipeline unit) ──────────────────────────────

export interface EpicContext {
  slug: string;
  phase: Phase;
  features: ManifestFeature[];
  artifacts: Record<string, string[]>;
  summary?: { problem: string; solution: string };
  worktree?: { branch: string; path: string };
  github?: { epic: number; repo: string };
  lastUpdated: string;
}

export type EpicEvent =
  | { type: "DESIGN_COMPLETED"; realSlug?: string; summary?: { problem: string; solution: string }; artifacts?: Record<string, string[]> }
  | { type: "PLAN_COMPLETED"; features: Array<{ slug: string; plan: string; description?: string; wave?: number }>; artifacts?: Record<string, string[]> }
  | { type: "FEATURE_COMPLETED"; featureSlug: string }
  | { type: "IMPLEMENT_COMPLETED" }
  | { type: "VALIDATE_COMPLETED" }
  | { type: "REGRESS"; targetPhase: Phase }
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
  | { type: "RESET" };

// ── Dispatch strategy ───────────────────────────────────────────

export type DispatchType = "single" | "fan-out" | "skip";
