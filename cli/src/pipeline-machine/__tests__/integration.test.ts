import { describe, test, expect } from "vitest";
import { createActor } from "xstate";
import { epicMachine } from "../epic";
import { featureMachine } from "../feature";
import type { EpicContext, FeatureContext } from "../types";

// ── Helpers ──────────────────────────────────────────────────────

function makeEpicContext(overrides: Partial<EpicContext> = {}): EpicContext {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    artifacts: {},
    lastUpdated: "2026-03-31T00:00:00Z",
    ...overrides,
  };
}

function startEpicActor(ctx?: Partial<EpicContext>) {
  const actor = createActor(epicMachine, { input: makeEpicContext(ctx) });
  actor.start();
  return actor;
}

function makeFeatureContext(overrides: Partial<FeatureContext> = {}): FeatureContext {
  return {
    slug: "test-feature",
    plan: "test-plan.md",
    status: "pending",
    ...overrides,
  };
}

function startFeatureActor(ctx?: Partial<FeatureContext>) {
  const actor = createActor(featureMachine, { input: makeFeatureContext(ctx) });
  actor.start();
  return actor;
}

const threeFeatures = [
  { slug: "feat-a", plan: "plan-a" },
  { slug: "feat-b", plan: "plan-b" },
  { slug: "feat-c", plan: "plan-c" },
];

const fourFeatures = [
  { slug: "feat-1", plan: "plan-1" },
  { slug: "feat-2", plan: "plan-2" },
  { slug: "feat-3", plan: "plan-3" },
  { slug: "feat-4", plan: "plan-4" },
];

// ── 1. Full design -> done happy path ───────────────────────────

describe("integration: full design -> done happy path", () => {
  test("completes the entire pipeline with 3 features", () => {
    const actor = startEpicActor();
    expect(actor.getSnapshot().value).toBe("design");

    // design -> plan (with slug rename)
    actor.send({ type: "DESIGN_COMPLETED", realSlug: "real-slug" });
    expect(actor.getSnapshot().value).toBe("plan");
    expect(actor.getSnapshot().context.slug).toBe("real-slug");

    // plan -> implement (3 features)
    actor.send({ type: "PLAN_COMPLETED", features: threeFeatures });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(actor.getSnapshot().context.features).toHaveLength(3);
    expect(actor.getSnapshot().context.features.every((f) => f.status === "pending")).toBe(true);

    // complete features one by one, verifying intermediate states
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(actor.getSnapshot().context.features[0].status).toBe("completed");
    expect(actor.getSnapshot().context.features[1].status).toBe("pending");
    expect(actor.getSnapshot().context.features[2].status).toBe("pending");

    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(actor.getSnapshot().context.features[1].status).toBe("completed");
    expect(actor.getSnapshot().context.features[2].status).toBe("pending");

    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-c" });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(actor.getSnapshot().context.features.every((f) => f.status === "completed")).toBe(true);

    // implement -> validate
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");

    // validate -> release
    actor.send({ type: "VALIDATE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("release");

    // release -> done
    actor.send({ type: "RELEASE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("done");
    expect(actor.getSnapshot().status).toBe("done");
  });
});

// ── 2. Cancel from mid-pipeline (implement) ─────────────────────

describe("integration: cancel from mid-pipeline", () => {
  test("cancels from implement after partially completing features", () => {
    const actor = startEpicActor();

    // advance to implement
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: threeFeatures });
    expect(actor.getSnapshot().value).toBe("implement");

    // complete one feature
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    expect(actor.getSnapshot().context.features[0].status).toBe("completed");

    // cancel
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
    expect(actor.getSnapshot().status).toBe("done");
  });
});

// ── 3. REGRESS regression loop ────────────────────────────────────

describe("integration: REGRESS regression loop", () => {
  test("fails validation, resets features via REGRESS, re-completes, and finishes", () => {
    const actor = startEpicActor();

    // advance to validate
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: threeFeatures });
    for (const f of threeFeatures) {
      actor.send({ type: "FEATURE_COMPLETED", featureSlug: f.slug });
    }
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");

    // validation fails — REGRESS to implement
    actor.send({ type: "REGRESS", targetPhase: "implement" });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(actor.getSnapshot().context.features.every((f) => f.status === "pending")).toBe(true);

    // re-complete all features
    for (const f of threeFeatures) {
      actor.send({ type: "FEATURE_COMPLETED", featureSlug: f.slug });
    }
    expect(actor.getSnapshot().context.features.every((f) => f.status === "completed")).toBe(true);

    // implement -> validate
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");

    // validate -> release
    actor.send({ type: "VALIDATE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("release");

    // release -> done
    actor.send({ type: "RELEASE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("done");
  });
});

// ── 4. Implement fan-out completion ─────────────────────────────

describe("integration: implement fan-out completion", () => {
  test("IMPLEMENT_COMPLETED is blocked until all features are completed", () => {
    const actor = startEpicActor();

    // advance to implement with 4 features
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: fourFeatures });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(actor.getSnapshot().context.features).toHaveLength(4);

    // complete features one by one, trying IMPLEMENT_COMPLETED after each
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-1" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("implement");

    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-2" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("implement");

    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-3" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("implement");

    // complete the last feature
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-4" });
    expect(actor.getSnapshot().context.features.every((f) => f.status === "completed")).toBe(true);

    // now IMPLEMENT_COMPLETED should succeed
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");
  });
});

// ── 5. State metadata verification across full lifecycle ────────

describe("integration: state metadata across lifecycle", () => {
  test("dispatchType is correct at every phase", () => {
    const actor = startEpicActor();

    // design: single
    const designMeta = actor.getSnapshot().getMeta();
    expect(designMeta["epic.design"]?.dispatchType).toBe("single");

    // plan: single
    actor.send({ type: "DESIGN_COMPLETED" });
    const planMeta = actor.getSnapshot().getMeta();
    expect(planMeta["epic.plan"]?.dispatchType).toBe("single");

    // implement: fan-out
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    const implementMeta = actor.getSnapshot().getMeta();
    expect(implementMeta["epic.implement"]?.dispatchType).toBe("fan-out");

    // validate: single
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    const validateMeta = actor.getSnapshot().getMeta();
    expect(validateMeta["epic.validate"]?.dispatchType).toBe("single");

    // release: single
    actor.send({ type: "VALIDATE_COMPLETED" });
    const releaseMeta = actor.getSnapshot().getMeta();
    expect(releaseMeta["epic.release"]?.dispatchType).toBe("single");

    // done: skip
    actor.send({ type: "RELEASE_COMPLETED" });
    const doneMeta = actor.getSnapshot().getMeta();
    expect(doneMeta["epic.done"]?.dispatchType).toBe("skip");
  });

  test("cancelled state has dispatchType skip", () => {
    const actor = startEpicActor();
    actor.send({ type: "CANCEL" });
    const meta = actor.getSnapshot().getMeta();
    expect(meta["epic.cancelled"]?.dispatchType).toBe("skip");
  });
});

// ── 6. Multiple cancel points ───────────────────────────────────

describe("integration: cancel from each non-terminal state", () => {
  test("CANCEL from design", () => {
    const actor = startEpicActor();
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
    expect(actor.getSnapshot().status).toBe("done");
  });

  test("CANCEL from plan", () => {
    const actor = startEpicActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("plan");
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
    expect(actor.getSnapshot().status).toBe("done");
  });

  test("CANCEL from implement", () => {
    const actor = startEpicActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: threeFeatures });
    expect(actor.getSnapshot().value).toBe("implement");
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
    expect(actor.getSnapshot().status).toBe("done");
  });

  test("CANCEL from validate", () => {
    const actor = startEpicActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
    expect(actor.getSnapshot().status).toBe("done");
  });

  test("CANCEL from release", () => {
    const actor = startEpicActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("release");
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
    expect(actor.getSnapshot().status).toBe("done");
  });
});

// ── 7. Feature machine integration ──────────────────────────────

describe("integration: feature machine full lifecycle", () => {
  test("pending -> in-progress -> completed", () => {
    const actor = startFeatureActor();
    expect(actor.getSnapshot().value).toBe("pending");

    // pending -> in-progress
    actor.send({ type: "START" });
    expect(actor.getSnapshot().value).toBe("in-progress");

    // in-progress -> completed
    actor.send({ type: "COMPLETE" });
    expect(actor.getSnapshot().value).toBe("completed");
    expect(actor.getSnapshot().status).toBe("done");
  });

  test("terminal completed state rejects all events", () => {
    const actor = startFeatureActor();
    actor.send({ type: "START" });
    actor.send({ type: "COMPLETE" });
    expect(actor.getSnapshot().value).toBe("completed");
    expect(actor.getSnapshot().status).toBe("done");

    // every event should be ignored
    const events = [
      { type: "START" as const },
      { type: "COMPLETE" as const },
      { type: "RESET" as const },
    ];
    for (const evt of events) {
      actor.send(evt);
      expect(actor.getSnapshot().value).toBe("completed");
    }
  });
});
