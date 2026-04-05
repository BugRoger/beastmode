import type { EpicContext, EpicEvent } from "./types";
import type { EpicStatus } from "../store/types";

/**
 * Action logic implementations for the epic machine.
 *
 * These are plain functions that compute the new context values.
 * The actual assign() calls happen inside setup() in epic.ts,
 * which ensures proper type inference with XState v5.
 *
 * regress() and regressFeatures() are inlined here — no dependency
 * on manifest/pure.ts.
 */

// Phase ordering for regression logic
const PHASE_ORDER: readonly EpicStatus[] = ["design", "plan", "implement", "validate", "release"];

export function computeEnrichFeatures(context: EpicContext, event: EpicEvent): EpicContext["features"] {
  if (event.type === "PLAN_COMPLETED") {
    const incoming = event.features.map((f) => ({
      slug: f.slug,
      plan: f.plan,
      description: f.description,
      wave: f.wave,
      status: "pending" as const,
    }));
    const existingBySlug = new Map(context.features.map((f) => [f.slug, f]));
    for (const feat of incoming) {
      if (!existingBySlug.has(feat.slug)) {
        existingBySlug.set(feat.slug, feat);
      }
    }
    return Array.from(existingBySlug.values());
  }
  return context.features;
}

export function computeRenameSlug(context: EpicContext, event: EpicEvent): string {
  if (event.type === "DESIGN_COMPLETED" && event.realSlug) {
    return event.realSlug;
  }
  return context.slug;
}

export function computeSetSummary(context: EpicContext, event: EpicEvent): EpicContext["summary"] {
  if (event.type === "DESIGN_COMPLETED" && event.summary) {
    return event.summary;
  }
  return context.summary;
}

export function computeSetFeatures(event: EpicEvent): EpicContext["features"] {
  if (event.type === "PLAN_COMPLETED") {
    return event.features.map((f) => ({
      slug: f.slug,
      plan: f.plan,
      description: f.description,
      wave: f.wave,
      status: "pending" as const,
    }));
  }
  return [];
}

export function computeResetFeatures(context: EpicContext): EpicContext["features"] {
  return context.features.map((f) => ({ ...f, status: "pending" as const }));
}

export function computeMarkFeatureCompleted(context: EpicContext, event: EpicEvent): EpicContext["features"] {
  if (event.type === "FEATURE_COMPLETED") {
    return context.features.map((f) =>
      f.slug === event.featureSlug
        ? { ...f, status: "completed" as const }
        : f,
    );
  }
  return context.features;
}

/**
 * Compute the regressed context — inlined from manifest/pure.ts regress().
 * Resets features to "pending" if regressing to or past "implement".
 * Clears downstream artifact entries.
 */
export function computeRegress(context: EpicContext, event: EpicEvent): Partial<EpicContext> {
  if (event.type !== "REGRESS") return {};

  const targetPhase = event.targetPhase;
  const targetIdx = PHASE_ORDER.indexOf(targetPhase);
  const implementIdx = PHASE_ORDER.indexOf("implement");

  // Reset features if regressing to or past implement
  const features = targetIdx <= implementIdx
    ? context.features.map((f) => ({ ...f, status: "pending" as const }))
    : context.features;

  // Clear artifacts for phases after targetPhase
  const artifacts: Record<string, string[]> = {};
  for (const [phase, files] of Object.entries(context.artifacts)) {
    const phaseIdx = PHASE_ORDER.indexOf(phase as EpicStatus);
    if (phaseIdx !== -1 && phaseIdx > targetIdx) continue; // downstream — drop
    artifacts[phase] = files;
  }

  return { features, artifacts };
}

/**
 * Compute the regressed context for specific failing features —
 * inlined from manifest/pure.ts regressFeatures().
 * Targets only failing features, incrementing their reDispatchCount.
 */
export function computeRegressFeatures(context: EpicContext, event: EpicEvent): Partial<EpicContext> {
  if (event.type !== "REGRESS_FEATURES") return {};

  const failingSet = new Set(event.failingFeatures);
  const MAX_REDISPATCH = 2;

  // Update only the failing features
  const features = context.features.map((f) => {
    if (!failingSet.has(f.slug)) return f;
    const newCount = (f.reDispatchCount ?? 0) + 1;
    const newStatus = newCount > MAX_REDISPATCH ? ("blocked" as const) : ("pending" as const);
    return { ...f, status: newStatus, reDispatchCount: newCount };
  });

  // Clear artifacts for phases after "implement"
  const implementIdx = PHASE_ORDER.indexOf("implement");
  const artifacts: Record<string, string[]> = {};
  for (const [phase, files] of Object.entries(context.artifacts)) {
    const phaseIdx = PHASE_ORDER.indexOf(phase as EpicStatus);
    if (phaseIdx !== -1 && phaseIdx > implementIdx) continue;
    artifacts[phase] = files;
  }

  return { features, artifacts };
}

export function computeAccumulateArtifacts(context: EpicContext, event: EpicEvent): EpicContext["artifacts"] {
  if (
    (event.type === "DESIGN_COMPLETED" || event.type === "PLAN_COMPLETED") &&
    event.artifacts
  ) {
    const merged = { ...context.artifacts };
    for (const [phase, paths] of Object.entries(event.artifacts)) {
      const existing = merged[phase] ?? [];
      merged[phase] = [...existing, ...paths];
    }
    return merged;
  }
  return context.artifacts;
}
