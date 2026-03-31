import { describe, test, expect } from "bun:test";
import { createActor } from "xstate";
import { epicMachine } from "../epic";
import { featureMachine } from "../feature";
import type { EpicContext } from "../types";
import type { FeatureContext } from "../types";

// ── Helpers ──────────────────────────────────────────────────────

function makeEpicContext(overrides: Partial<EpicContext> = {}): EpicContext {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    artifacts: {},
    blocked: null,
    lastUpdated: "2026-03-31T00:00:00Z",
    ...overrides,
  };
}

function startEpicActor(ctx?: Partial<EpicContext>) {
  const actor = createActor(epicMachine, { input: makeEpicContext(ctx) });
  actor.start();
  return actor;
}

function makeFeatureContext(
  overrides: Partial<FeatureContext> = {},
): FeatureContext {
  return {
    slug: "test-feature",
    plan: "test-plan.md",
    status: "pending",
    ...overrides,
  };
}

function startFeatureActor(ctx?: Partial<FeatureContext>) {
  const actor = createActor(featureMachine, {
    input: makeFeatureContext(ctx),
  });
  actor.start();
  return actor;
}

const twoFeatures = [
  { slug: "feat-a", plan: "plan-a" },
  { slug: "feat-b", plan: "plan-b" },
];

// ── 1. Basic snapshot round-trip ─────────────────────────────────

describe("basic snapshot round-trip", () => {
  test("persist and restore preserves state value through design -> plan -> implement", () => {
    const actor = startEpicActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    expect(actor.getSnapshot().value).toBe("implement");

    const persisted = actor.getPersistedSnapshot();
    const json = JSON.stringify(persisted);
    const restored = JSON.parse(json);

    const actor2 = createActor(epicMachine, { snapshot: restored });
    actor2.start();

    expect(actor2.getSnapshot().value).toBe("implement");
  });

  test("persisted snapshot survives JSON serialization round-trip", () => {
    const actor = startEpicActor();
    actor.send({ type: "DESIGN_COMPLETED" });

    const persisted = actor.getPersistedSnapshot();
    const json = JSON.stringify(persisted);
    const deserialized = JSON.parse(json);

    // Structural equality after round-trip
    expect(deserialized).toEqual(persisted);
  });

  test("restored actor accepts further events", () => {
    const actor = startEpicActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });

    const persisted = actor.getPersistedSnapshot();
    const json = JSON.stringify(persisted);

    const actor2 = createActor(epicMachine, {
      snapshot: JSON.parse(json),
    });
    actor2.start();

    // Continue from implement
    actor2.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor2.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor2.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor2.getSnapshot().value).toBe("validate");
  });
});

// ── 2. Load manifest-shaped fixture ──────────────────────────────

describe("manifest-shaped fixture input", () => {
  test("actor created from manifest-like context starts in design and advances", () => {
    // Simulate the shape of a PipelineManifest as input context
    const fixtureContext: EpicContext = {
      slug: "fixture-epic",
      phase: "design",
      features: [],
      artifacts: { design: ["design.md"], plan: ["plan.md"] },
      worktree: { branch: "feature/fixture", path: "/tmp/fixture" },
      github: { epic: 42, repo: "owner/repo" },
      blocked: null,
      lastUpdated: "2026-03-31T00:00:00Z",
    };

    const actor = createActor(epicMachine, { input: fixtureContext });
    actor.start();
    expect(actor.getSnapshot().value).toBe("design");

    // Advance to implement
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({
      type: "PLAN_COMPLETED",
      features: [
        { slug: "feat-a", plan: "plan-a.md" },
        { slug: "feat-b", plan: "plan-b.md" },
      ],
    });
    expect(actor.getSnapshot().value).toBe("implement");

    // Persist and restore
    const persisted = actor.getPersistedSnapshot();
    const actor2 = createActor(epicMachine, {
      snapshot: JSON.parse(JSON.stringify(persisted)),
    });
    actor2.start();

    expect(actor2.getSnapshot().value).toBe("implement");
    expect(actor2.getSnapshot().context.slug).toBe("fixture-epic");
    expect(actor2.getSnapshot().context.github).toEqual({
      epic: 42,
      repo: "owner/repo",
    });
    expect(actor2.getSnapshot().context.worktree).toEqual({
      branch: "feature/fixture",
      path: "/tmp/fixture",
    });
  });
});

// ── 3. Round-trip preserves all fields ───────────────────────────

describe("round-trip preserves all context fields", () => {
  test("slug, features, artifacts, github, worktree, blocked, lastUpdated all survive", () => {
    const actor = startEpicActor({
      slug: "full-context-epic",
      features: [],
      artifacts: { design: ["d1.md", "d2.md"] },
      worktree: { branch: "feature/full", path: "/tmp/full" },
      github: { epic: 99, repo: "org/repo" },
      blocked: { gate: "review", reason: "awaiting approval" },
      lastUpdated: "2026-03-31T12:00:00Z",
    });

    // Advance through design -> plan -> implement
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({
      type: "PLAN_COMPLETED",
      features: [
        { slug: "alpha", plan: "plan-alpha.md" },
        { slug: "beta", plan: "plan-beta.md" },
      ],
    });

    // Mark one feature completed
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "alpha" });

    // Persist -> JSON round-trip -> restore
    const persisted = actor.getPersistedSnapshot();
    const json = JSON.stringify(persisted);
    const actor2 = createActor(epicMachine, { snapshot: JSON.parse(json) });
    actor2.start();

    const ctx = actor2.getSnapshot().context;

    expect(ctx.slug).toBe("full-context-epic");
    expect(ctx.features).toHaveLength(2);
    expect(ctx.features[0]).toEqual({
      slug: "alpha",
      plan: "plan-alpha.md",
      status: "completed",
    });
    expect(ctx.features[1]).toEqual({
      slug: "beta",
      plan: "plan-beta.md",
      status: "pending",
    });
    expect(ctx.artifacts).toEqual({ design: ["d1.md", "d2.md"] });
    expect(ctx.worktree).toEqual({
      branch: "feature/full",
      path: "/tmp/full",
    });
    expect(ctx.github).toEqual({ epic: 99, repo: "org/repo" });
    // blocked gets cleared during transitions (markCancelled) or preserved
    // After DESIGN_COMPLETED, blocked is not explicitly cleared, so check it survived
    expect(ctx.blocked).toEqual({ gate: "review", reason: "awaiting approval" });
    // lastUpdated gets refreshed on each transition, so just verify it is a valid ISO string
    expect(new Date(ctx.lastUpdated).toISOString()).toBe(ctx.lastUpdated);
  });

  test("null blocked survives round-trip", () => {
    const actor = startEpicActor({ blocked: null });
    actor.send({ type: "DESIGN_COMPLETED" });

    const persisted = actor.getPersistedSnapshot();
    const actor2 = createActor(epicMachine, {
      snapshot: JSON.parse(JSON.stringify(persisted)),
    });
    actor2.start();

    expect(actor2.getSnapshot().context.blocked).toBeNull();
  });

  test("empty features array survives round-trip", () => {
    const actor = startEpicActor();
    // Stay in design — features is empty
    const persisted = actor.getPersistedSnapshot();
    const actor2 = createActor(epicMachine, {
      snapshot: JSON.parse(JSON.stringify(persisted)),
    });
    actor2.start();

    expect(actor2.getSnapshot().context.features).toEqual([]);
  });

  test("empty artifacts survives round-trip", () => {
    const actor = startEpicActor({ artifacts: {} });
    const persisted = actor.getPersistedSnapshot();
    const actor2 = createActor(epicMachine, {
      snapshot: JSON.parse(JSON.stringify(persisted)),
    });
    actor2.start();

    expect(actor2.getSnapshot().context.artifacts).toEqual({});
  });
});

// ── 4. Feature machine round-trip ────────────────────────────────

describe("feature machine round-trip", () => {
  test("persist and restore in-progress state", () => {
    const actor = startFeatureActor();
    actor.send({ type: "START" });
    expect(actor.getSnapshot().value).toBe("in-progress");

    const persisted = actor.getPersistedSnapshot();
    const json = JSON.stringify(persisted);
    const actor2 = createActor(featureMachine, {
      snapshot: JSON.parse(json),
    });
    actor2.start();

    expect(actor2.getSnapshot().value).toBe("in-progress");
    expect(actor2.getSnapshot().context.slug).toBe("test-feature");
    expect(actor2.getSnapshot().context.plan).toBe("test-plan.md");
  });

  test("restored feature actor accepts further events", () => {
    const actor = startFeatureActor();
    actor.send({ type: "START" });

    const persisted = actor.getPersistedSnapshot();
    const actor2 = createActor(featureMachine, {
      snapshot: JSON.parse(JSON.stringify(persisted)),
    });
    actor2.start();

    actor2.send({ type: "COMPLETE" });
    expect(actor2.getSnapshot().value).toBe("completed");
    expect(actor2.getSnapshot().status).toBe("done");
  });

  test("blocked state survives round-trip", () => {
    const actor = startFeatureActor();
    actor.send({ type: "START" });
    actor.send({ type: "BLOCK" });
    expect(actor.getSnapshot().value).toBe("blocked");

    const persisted = actor.getPersistedSnapshot();
    const actor2 = createActor(featureMachine, {
      snapshot: JSON.parse(JSON.stringify(persisted)),
    });
    actor2.start();

    expect(actor2.getSnapshot().value).toBe("blocked");

    // Can unblock from restored state
    actor2.send({ type: "UNBLOCK" });
    expect(actor2.getSnapshot().value).toBe("in-progress");
  });

  test("feature context with github metadata survives round-trip", () => {
    const actor = startFeatureActor({ github: { issue: 77 } });
    actor.send({ type: "START" });

    const persisted = actor.getPersistedSnapshot();
    const actor2 = createActor(featureMachine, {
      snapshot: JSON.parse(JSON.stringify(persisted)),
    });
    actor2.start();

    expect(actor2.getSnapshot().context.github).toEqual({ issue: 77 });
  });
});

// ── 5. Round-trip after validate regression ──────────────────────

describe("round-trip after validate regression", () => {
  test("VALIDATE_FAILED state persists with reset features", () => {
    const actor = startEpicActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");

    // Validation fails — regresses to implement with pending features
    actor.send({ type: "VALIDATE_FAILED" });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(
      actor.getSnapshot().context.features.every((f) => f.status === "pending"),
    ).toBe(true);

    // Persist and restore
    const persisted = actor.getPersistedSnapshot();
    const json = JSON.stringify(persisted);
    const actor2 = createActor(epicMachine, { snapshot: JSON.parse(json) });
    actor2.start();

    // Verify state is implement with all pending features
    expect(actor2.getSnapshot().value).toBe("implement");
    expect(actor2.getSnapshot().context.features).toHaveLength(2);
    expect(
      actor2
        .getSnapshot()
        .context.features.every((f) => f.status === "pending"),
    ).toBe(true);
  });

  test("restored actor after regression respects guards", () => {
    const actor = startEpicActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_FAILED" });

    // Persist and restore
    const persisted = actor.getPersistedSnapshot();
    const actor2 = createActor(epicMachine, {
      snapshot: JSON.parse(JSON.stringify(persisted)),
    });
    actor2.start();

    // Guard blocks IMPLEMENT_COMPLETED when features are still pending
    actor2.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor2.getSnapshot().value).toBe("implement");

    // Re-complete features, then advance
    actor2.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor2.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor2.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor2.getSnapshot().value).toBe("validate");
  });

  test("full lifecycle: persist at regression, restore, complete to done", () => {
    const actor = startEpicActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_FAILED" });

    // Persist mid-regression
    const persisted = actor.getPersistedSnapshot();
    const actor2 = createActor(epicMachine, {
      snapshot: JSON.parse(JSON.stringify(persisted)),
    });
    actor2.start();

    // Complete the full remaining lifecycle
    actor2.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor2.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor2.send({ type: "IMPLEMENT_COMPLETED" });
    actor2.send({ type: "VALIDATE_COMPLETED" });
    actor2.send({ type: "RELEASE_COMPLETED" });

    expect(actor2.getSnapshot().value).toBe("done");
    expect(actor2.getSnapshot().status).toBe("done");
  });
});
