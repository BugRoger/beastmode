import { describe, test, expect } from "bun:test";
import type { PipelineManifest, ManifestFeature } from "../manifest-store";
import type { PhaseOutput, PlanArtifacts } from "../types";
import type { GatesConfig } from "../config";
import {
  enrich,
  advancePhase,
  regressPhase,
  markFeature,
  cancel,
  setGitHubEpic,
  setFeatureGitHubIssue,
  deriveNextAction,
  checkBlocked,
  shouldAdvance,
  getPendingFeatures,
} from "../manifest";

function makeManifest(
  overrides: Partial<PipelineManifest> = {},
): PipelineManifest {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    artifacts: {},
    blocked: null,
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

// --- advancePhase ---

describe("advancePhase", () => {
  test("sets phase and updates lastUpdated", () => {
    const manifest = makeManifest({ phase: "design" });
    const result = advancePhase(manifest, "plan");

    expect(result.phase).toBe("plan");
    expect(result.lastUpdated).not.toBe(manifest.lastUpdated);
  });

  test("returns new object, does not mutate input", () => {
    const manifest = makeManifest({ phase: "design" });
    const result = advancePhase(manifest, "plan");

    expect(result).not.toBe(manifest);
    expect(manifest.phase).toBe("design");
  });
});

// --- regressPhase ---

describe("regressPhase", () => {
  test("resets all features to pending", () => {
    const manifest = makeManifest({
      phase: "validate",
      features: [
        makeFeature({ slug: "a", status: "completed" }),
        makeFeature({ slug: "b", status: "in-progress" }),
        makeFeature({ slug: "c", status: "blocked" }),
      ],
    });

    const result = regressPhase(manifest, "implement");

    expect(result.features.every((f) => f.status === "pending")).toBe(true);
  });

  test("sets phase correctly", () => {
    const manifest = makeManifest({ phase: "validate" });
    const result = regressPhase(manifest, "implement");

    expect(result.phase).toBe("implement");
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

// --- cancel ---

describe("cancel", () => {
  test("sets phase to cancelled", () => {
    const manifest = makeManifest({ phase: "implement" });
    const result = cancel(manifest);

    expect(result.phase as string).toBe("cancelled");
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

// --- deriveNextAction ---

describe("deriveNextAction", () => {
  test("design -> plan single", () => {
    const manifest = makeManifest({ phase: "design" });
    const action = deriveNextAction(manifest);

    expect(action).toEqual({
      phase: "plan",
      args: ["test-epic"],
      type: "single",
    });
  });

  test("plan -> plan single", () => {
    const manifest = makeManifest({ phase: "plan" });
    const action = deriveNextAction(manifest);

    expect(action).toEqual({
      phase: "plan",
      args: ["test-epic"],
      type: "single",
    });
  });

  test("implement with pending features -> fan-out", () => {
    const manifest = makeManifest({
      phase: "implement",
      features: [
        makeFeature({ slug: "a", status: "pending" }),
        makeFeature({ slug: "b", status: "in-progress" }),
        makeFeature({ slug: "c", status: "completed" }),
      ],
    });

    const action = deriveNextAction(manifest);

    expect(action).toEqual({
      phase: "implement",
      args: ["test-epic"],
      type: "fan-out",
      features: ["a", "b"],
    });
  });

  test("implement with all completed -> null", () => {
    const manifest = makeManifest({
      phase: "implement",
      features: [
        makeFeature({ slug: "a", status: "completed" }),
        makeFeature({ slug: "b", status: "completed" }),
      ],
    });

    const action = deriveNextAction(manifest);
    expect(action).toBeNull();
  });

  test("validate -> validate single", () => {
    const manifest = makeManifest({ phase: "validate" });
    const action = deriveNextAction(manifest);

    expect(action).toEqual({
      phase: "validate",
      args: ["test-epic"],
      type: "single",
    });
  });

  test("release -> release single", () => {
    const manifest = makeManifest({ phase: "release" });
    const action = deriveNextAction(manifest);

    expect(action).toEqual({
      phase: "release",
      args: ["test-epic"],
      type: "single",
    });
  });
});

// --- checkBlocked ---

describe("checkBlocked", () => {
  test("returns null when no blocked features and no human gates", () => {
    const manifest = makeManifest({
      phase: "implement",
      features: [makeFeature({ status: "pending" })],
    });
    const gates: GatesConfig = {};

    expect(checkBlocked(manifest, gates)).toBeNull();
  });

  test("returns structured blocked when feature is blocked", () => {
    const manifest = makeManifest({
      phase: "implement",
      features: [makeFeature({ slug: "feat-a", status: "blocked" })],
    });
    const gates: GatesConfig = {};

    const result = checkBlocked(manifest, gates);
    expect(result).toEqual({
      gate: "feature",
      reason: "Feature feat-a is blocked",
    });
  });

  test("returns structured blocked when phase has human gate", () => {
    const manifest = makeManifest({ phase: "implement" });
    const gates: GatesConfig = {
      implement: { review: "human" },
    };

    const result = checkBlocked(manifest, gates);
    expect(result).toEqual({
      gate: "review",
      reason: "Human gate",
    });
  });
});

// --- shouldAdvance ---

describe("shouldAdvance", () => {
  test("design -> plan (always)", () => {
    const manifest = makeManifest({ phase: "design" });
    expect(shouldAdvance(manifest, undefined)).toBe("plan");
  });

  test("plan -> implement (when features in output)", () => {
    const manifest = makeManifest({ phase: "plan" });
    const output: PhaseOutput = {
      status: "completed",
      artifacts: {
        features: [{ slug: "feat-a", plan: "plan.md" }],
      } as PlanArtifacts,
    };

    expect(shouldAdvance(manifest, output)).toBe("implement");
  });

  test("plan -> null (when no features)", () => {
    const manifest = makeManifest({ phase: "plan" });
    const output: PhaseOutput = {
      status: "completed",
      artifacts: { design: "design.md" } as any,
    };

    expect(shouldAdvance(manifest, output)).toBeNull();
  });

  test("implement -> validate (all features completed)", () => {
    const manifest = makeManifest({
      phase: "implement",
      features: [
        makeFeature({ slug: "a", status: "completed" }),
        makeFeature({ slug: "b", status: "completed" }),
      ],
    });

    expect(shouldAdvance(manifest, undefined)).toBe("validate");
  });

  test("implement -> null (features still pending)", () => {
    const manifest = makeManifest({
      phase: "implement",
      features: [
        makeFeature({ slug: "a", status: "completed" }),
        makeFeature({ slug: "b", status: "pending" }),
      ],
    });

    expect(shouldAdvance(manifest, undefined)).toBeNull();
  });

  test("validate -> release (output completed)", () => {
    const manifest = makeManifest({ phase: "validate" });
    const output: PhaseOutput = {
      status: "completed",
      artifacts: { report: "report.md", passed: true } as any,
    };

    expect(shouldAdvance(manifest, output)).toBe("release");
  });

  test("validate -> null (output not completed)", () => {
    const manifest = makeManifest({ phase: "validate" });
    const output: PhaseOutput = {
      status: "error",
      artifacts: { report: "report.md", passed: false } as any,
    };

    expect(shouldAdvance(manifest, output)).toBeNull();
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
