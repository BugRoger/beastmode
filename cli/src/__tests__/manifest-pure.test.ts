import { describe, test, expect } from "vitest";
import type { PipelineManifest, ManifestFeature } from "../manifest/store";
import {
  markFeature,
  setGitHubEpic,
  setFeatureGitHubIssue,
  getPendingFeatures,
  regressFeatures,
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

// --- regressFeatures ---

describe("regressFeatures", () => {
  test("resets only failing features to pending", () => {
    const manifest = makeManifest({
      phase: "validate",
      features: [
        makeFeature({ slug: "feat-a", status: "completed" }),
        makeFeature({ slug: "feat-b", status: "completed" }),
        makeFeature({ slug: "feat-c", status: "completed" }),
      ],
    });

    const result = regressFeatures(manifest, ["feat-b"]);
    expect(result.phase).toBe("implement");
    expect(result.features[0]).toMatchObject({ slug: "feat-a", status: "completed" });
    expect(result.features[1]).toMatchObject({ slug: "feat-b", status: "pending", reDispatchCount: 1 });
    expect(result.features[2]).toMatchObject({ slug: "feat-c", status: "completed" });
  });

  test("increments reDispatchCount on repeated regression", () => {
    const manifest = makeManifest({
      phase: "validate",
      features: [
        makeFeature({ slug: "feat-a", status: "completed", reDispatchCount: 1 }),
      ],
    });

    const result = regressFeatures(manifest, ["feat-a"]);
    expect(result.features[0]).toMatchObject({ slug: "feat-a", status: "pending", reDispatchCount: 2 });
  });

  test("marks feature as blocked when reDispatchCount exceeds 2", () => {
    const manifest = makeManifest({
      phase: "validate",
      features: [
        makeFeature({ slug: "feat-a", status: "completed", reDispatchCount: 2 }),
      ],
    });

    const result = regressFeatures(manifest, ["feat-a"]);
    expect(result.features[0]).toMatchObject({ slug: "feat-a", status: "blocked", reDispatchCount: 3 });
  });

  test("returns original manifest when failingFeatures is empty", () => {
    const manifest = makeManifest({
      phase: "validate",
      features: [
        makeFeature({ slug: "feat-a", status: "completed" }),
      ],
    });

    const result = regressFeatures(manifest, []);
    expect(result.features[0]).toMatchObject({ slug: "feat-a", status: "completed" });
    expect(result.phase).toBe("validate");
  });

  test("clears validate and release artifacts on regression", () => {
    const manifest = makeManifest({
      phase: "validate",
      features: [
        makeFeature({ slug: "feat-a", status: "completed" }),
      ],
      artifacts: {
        design: ["design.md"],
        plan: ["plan.md"],
        implement: ["impl.md"],
        validate: ["validate.md"],
        release: ["release.md"],
      },
    });

    const result = regressFeatures(manifest, ["feat-a"]);
    expect(result.artifacts).toHaveProperty("design");
    expect(result.artifacts).toHaveProperty("plan");
    expect(result.artifacts).toHaveProperty("implement");
    expect(result.artifacts).not.toHaveProperty("validate");
    expect(result.artifacts).not.toHaveProperty("release");
  });
});
