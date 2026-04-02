import type { EpicContext, EpicEvent } from "./types";
import { regress } from "../manifest";

/**
 * Action logic implementations for the epic machine.
 *
 * These are plain functions that compute the new context values.
 * The actual assign() calls happen inside setup() in epic.ts,
 * which ensures proper type inference with XState v5.
 */

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
 * Compute the regressed context using the manifest regress() pure function.
 * Returns a partial EpicContext with all fields that need updating.
 */
export function computeRegress(context: EpicContext, event: EpicEvent): Partial<EpicContext> {
  if (event.type !== "REGRESS") return {};

  const manifest = {
    slug: context.slug,
    phase: context.phase,
    features: context.features,
    artifacts: context.artifacts,
    lastUpdated: context.lastUpdated,
  };
  const result = regress(manifest as any, event.targetPhase);
  return {
    phase: result.phase,
    features: result.features,
    artifacts: result.artifacts,
  };
}
