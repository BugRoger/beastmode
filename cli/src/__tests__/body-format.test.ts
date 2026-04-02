import { describe, test, expect } from "bun:test";
import type { PipelineManifest, ManifestFeature } from "../manifest-store";
import { formatEpicBody, formatFeatureBody } from "../body-format";

function makeManifest(
  overrides: Partial<PipelineManifest> = {},
): PipelineManifest {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    artifacts: {},
    lastUpdated: "2026-03-29T00:00:00Z",
    ...overrides,
  };
}

function makeFeature(
  overrides: Partial<ManifestFeature> = {},
): ManifestFeature {
  return {
    slug: "feat-a",
    plan: "plan-a.md",
    status: "pending",
    ...overrides,
  };
}

// --- formatEpicBody ---

describe("formatEpicBody", () => {
  test("includes phase badge", () => {
    const manifest = makeManifest({ phase: "design" });
    const body = formatEpicBody(manifest);

    expect(body).toContain("**Phase:** design");
  });

  test("includes problem and solution sections when summary present", () => {
    const manifest = makeManifest();
    const body = formatEpicBody({
      ...manifest,
      summary: { problem: "The problem", solution: "The solution" },
    });

    expect(body).toContain("## Problem\n\nThe problem");
    expect(body).toContain("## Solution\n\nThe solution");
  });

  test("omits problem and solution when summary missing", () => {
    const manifest = makeManifest();
    const body = formatEpicBody(manifest);

    expect(body).not.toContain("## Problem");
    expect(body).not.toContain("## Solution");
  });

  test("omits problem section when problem is empty string", () => {
    const manifest = makeManifest();
    const body = formatEpicBody({
      ...manifest,
      summary: { problem: "", solution: "The solution" },
    });

    expect(body).not.toContain("## Problem");
  });

  test("shows feature checklist with checkboxes", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-a", status: "pending" }),
        makeFeature({ slug: "feat-b", status: "completed" }),
      ],
    });
    const body = formatEpicBody(manifest);

    expect(body).toContain("- [ ]");
    expect(body).toContain("- [x]");
  });

  test("shows issue link when feature has github issue", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-a", github: { issue: 42 } }),
      ],
    });
    const body = formatEpicBody(manifest);

    expect(body).toContain("#42");
  });

  test("shows plain slug when feature has no github issue", () => {
    const manifest = makeManifest({
      features: [makeFeature({ slug: "feat-a" })],
    });
    const body = formatEpicBody(manifest);

    expect(body).toContain("feat-a");
    // Feature line should not have an issue number reference like #42
    expect(body).not.toMatch(/#\d+/);
  });

  test("excludes cancelled features", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-keep", status: "pending" }),
        makeFeature({ slug: "feat-drop", status: "cancelled" as any }),
      ],
    });
    const body = formatEpicBody(manifest);

    expect(body).toContain("feat-keep");
    expect(body).not.toContain("feat-drop");
  });

  test("preserves manifest array order", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "charlie", status: "pending" }),
        makeFeature({ slug: "alpha", status: "pending" }),
        makeFeature({ slug: "bravo", status: "pending" }),
      ],
    });
    const body = formatEpicBody(manifest);

    const charlieIdx = body.indexOf("charlie");
    const alphaIdx = body.indexOf("alpha");
    const bravoIdx = body.indexOf("bravo");

    expect(charlieIdx).toBeLessThan(alphaIdx);
    expect(alphaIdx).toBeLessThan(bravoIdx);
  });

  test("handles empty feature list", () => {
    const manifest = makeManifest({ features: [] });
    const body = formatEpicBody(manifest);

    // No features section when list is empty — nothing to show
    expect(body).not.toContain("## Features");
  });

  test("handles all features completed", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-a", status: "completed" }),
        makeFeature({ slug: "feat-b", status: "completed" }),
      ],
    });
    const body = formatEpicBody(manifest);

    // All should be checked
    expect(body).not.toContain("- [ ]");
    expect(body).toContain("- [x]");
  });

  test("graceful fallback: phase badge and checklist without summary", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-a", status: "pending" }),
        makeFeature({ slug: "feat-b", status: "completed" }),
      ],
    });
    const body = formatEpicBody(manifest);

    expect(body).toContain("**Phase:** design");
    expect(body).toContain("- [ ]");
    expect(body).toContain("- [x]");
    expect(body).not.toContain("## Problem");
    expect(body).not.toContain("## Solution");
  });
});

// --- formatFeatureBody ---

describe("formatFeatureBody", () => {
  test("includes description when present", () => {
    const feature = makeFeature({ slug: "feat-a" });
    const body = formatFeatureBody(
      { ...feature, description: "Feature details" },
      42,
    );

    expect(body).toContain("Feature details");
  });

  test("includes epic back-reference", () => {
    const feature = makeFeature({ slug: "feat-a" });
    const body = formatFeatureBody(feature, 42);

    expect(body).toContain("**Epic:** #42");
  });

  test("falls back to stub format when description missing", () => {
    const feature = makeFeature({ slug: "feat-a" });
    const body = formatFeatureBody(feature, 42);

    expect(body).toContain("feat-a");
    expect(body).toContain("**Epic:** #42");
  });

  test("falls back to stub format when description is empty string", () => {
    const feature = makeFeature({ slug: "feat-a" });
    const body = formatFeatureBody({ ...feature, description: "" }, 42);

    expect(body).toContain("feat-a");
    expect(body).toContain("**Epic:** #42");
  });
});
