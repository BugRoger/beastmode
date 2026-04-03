import { describe, test, expect } from "bun:test";
import type { PipelineManifest, ManifestFeature } from "../manifest/store";
import {
  enrich,
  markFeature,
  setGitHubEpic,
  setFeatureGitHubIssue,
  getPendingFeatures,
} from "../manifest/pure";

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

// --- enrich ---

describe("enrich", () => {
  test("merges new features into empty manifest", () => {
    const manifest = makeManifest();
    const features: ManifestFeature[] = [
      makeFeature({ slug: "feat-a" }),
      makeFeature({ slug: "feat-b" }),
    ];
    const result = enrich(manifest, { phase: "plan", features });

    expect(result.features).toHaveLength(2);
    expect(result.features[0].slug).toBe("feat-a");
    expect(result.features[1].slug).toBe("feat-b");
  });

  test("updates existing features, preserves github info", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({
          slug: "feat-a",
          plan: "old-plan.md",
          status: "pending",
          github: { issue: 42 },
        }),
      ],
    });

    const result = enrich(manifest, {
      phase: "plan",
      features: [
        makeFeature({ slug: "feat-a", plan: "new-plan.md", status: "in-progress" }),
      ],
    });

    expect(result.features).toHaveLength(1);
    expect(result.features[0].plan).toBe("new-plan.md");
    expect(result.features[0].status).toBe("in-progress");
    expect(result.features[0].github).toEqual({ issue: 42 });
  });

  test("accumulates artifacts under phase key", () => {
    const manifest = makeManifest({
      artifacts: { design: ["design.md"] },
    });

    const result = enrich(manifest, {
      phase: "design",
      artifacts: ["design-v2.md"],
    });

    expect(result.artifacts.design).toEqual(["design.md", "design-v2.md"]);
  });

  test("returns new object, does not mutate input", () => {
    const manifest = makeManifest();
    const result = enrich(manifest, {
      phase: "plan",
      features: [makeFeature()],
    });

    expect(result).not.toBe(manifest);
    expect(manifest.features).toHaveLength(0);
    expect(result.features).toHaveLength(1);
  });
});


// --- markFeature ---

describe("markFeature", () => {
  test("sets feature status", () => {
    const manifest = makeManifest({
      features: [makeFeature({ slug: "feat-a", status: "pending" })],
    });

    const result = markFeature(manifest, "feat-a", "completed");

    expect(result.features[0].status).toBe("completed");
  });

  test("returns new object, does not mutate input", () => {
    const manifest = makeManifest({
      features: [makeFeature({ slug: "feat-a", status: "pending" })],
    });

    const result = markFeature(manifest, "feat-a", "completed");

    expect(result).not.toBe(manifest);
    expect(manifest.features[0].status).toBe("pending");
  });

  test("handles missing feature gracefully", () => {
    const manifest = makeManifest({
      features: [makeFeature({ slug: "feat-a" })],
    });

    const result = markFeature(manifest, "nonexistent", "completed");

    expect(result).toBe(manifest);
  });
});

// --- setGitHubEpic ---

describe("setGitHubEpic", () => {
  test("sets github.epic and repo", () => {
    const manifest = makeManifest();
    const result = setGitHubEpic(manifest, 123, "owner/repo");

    expect(result.github).toEqual({ epic: 123, repo: "owner/repo" });
  });
});

// --- setFeatureGitHubIssue ---

describe("setFeatureGitHubIssue", () => {
  test("sets feature github.issue", () => {
    const manifest = makeManifest({
      features: [makeFeature({ slug: "feat-a" })],
    });

    const result = setFeatureGitHubIssue(manifest, "feat-a", 99);

    expect(result.features[0].github).toEqual({ issue: 99 });
  });
});

// --- getPendingFeatures ---

describe("getPendingFeatures", () => {
  test("filters pending and in-progress features", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "a", status: "pending" }),
        makeFeature({ slug: "b", status: "in-progress" }),
        makeFeature({ slug: "c", status: "completed" }),
        makeFeature({ slug: "d", status: "blocked" }),
      ],
    });

    const result = getPendingFeatures(manifest);
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.slug)).toEqual(["a", "b"]);
  });
});
