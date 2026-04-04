import { describe, test, expect } from "vitest";
import { createActor } from "xstate";
import { epicMachine } from "../epic";
import type { EpicContext } from "../types";

// ── Helpers ──────────────────────────────────────────────────────

function makeContext(overrides: Partial<EpicContext> = {}): EpicContext {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    artifacts: {},
    lastUpdated: "2026-03-31T00:00:00Z",
    ...overrides,
  };
}

function startActor(ctx?: Partial<EpicContext>) {
  const actor = createActor(epicMachine, { input: makeContext(ctx) });
  actor.start();
  return actor;
}

const twoFeatures = [
  { slug: "feat-a", plan: "plan-a" },
  { slug: "feat-b", plan: "plan-b" },
];

// ── 1. Initial state and context ─────────────────────────────────

describe("initial state and context", () => {
  test("starts in design state", () => {
    const actor = startActor();
    expect(actor.getSnapshot().value).toBe("design");
  });

  test("context matches input", () => {
    const actor = startActor({ slug: "my-epic" });
    const ctx = actor.getSnapshot().context;
    expect(ctx.slug).toBe("my-epic");
    expect(ctx.phase).toBe("design");
    expect(ctx.features).toEqual([]);
    expect(ctx.artifacts).toEqual({});
  });
});

// ── 2. Happy path ────────────────────────────────────────────────

describe("happy path: design -> plan -> implement -> validate -> release -> done", () => {
  test("completes full lifecycle", () => {
    const actor = startActor();

    // design -> plan
    actor.send({ type: "DESIGN_COMPLETED", realSlug: "renamed-epic" });
    expect(actor.getSnapshot().value).toBe("plan");
    expect(actor.getSnapshot().context.slug).toBe("renamed-epic");

    // plan -> implement
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(actor.getSnapshot().context.features).toHaveLength(2);
    expect(actor.getSnapshot().context.features[0].status).toBe("pending");

    // complete features
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    expect(actor.getSnapshot().context.features[0].status).toBe("completed");
    expect(actor.getSnapshot().value).toBe("implement");

    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    expect(actor.getSnapshot().context.features[1].status).toBe("completed");

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

// ── 3. Each transition individually ──────────────────────────────

describe("individual transitions", () => {
  test("design -> plan via DESIGN_COMPLETED", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("plan");
  });

  test("DESIGN_COMPLETED without realSlug keeps original slug", () => {
    const actor = startActor({ slug: "original" });
    actor.send({ type: "DESIGN_COMPLETED" });
    expect(actor.getSnapshot().context.slug).toBe("original");
  });

  test("DESIGN_COMPLETED with realSlug renames slug", () => {
    const actor = startActor({ slug: "original" });
    actor.send({ type: "DESIGN_COMPLETED", realSlug: "new-name" });
    expect(actor.getSnapshot().context.slug).toBe("new-name");
  });

  test("plan -> implement via PLAN_COMPLETED with features", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    expect(actor.getSnapshot().value).toBe("implement");
  });

  test("FEATURE_COMPLETED marks single feature as completed", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });

    const features = actor.getSnapshot().context.features;
    expect(features[0].status).toBe("completed");
    expect(features[1].status).toBe("pending");
  });

  test("FEATURE_COMPLETED for unknown slug leaves features unchanged", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "nonexistent" });

    const features = actor.getSnapshot().context.features;
    expect(features[0].status).toBe("pending");
    expect(features[1].status).toBe("pending");
  });

  test("implement -> validate via IMPLEMENT_COMPLETED when all features done", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");
  });

  test("validate -> release via VALIDATE_COMPLETED", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("release");
  });

  test("release -> done via RELEASE_COMPLETED", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_COMPLETED" });
    actor.send({ type: "RELEASE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("done");
  });
});

// ── 4. Guard conditions ──────────────────────────────────────────

describe("guard conditions", () => {
  test("hasFeatures blocks PLAN_COMPLETED with empty features array", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [] });
    expect(actor.getSnapshot().value).toBe("plan");
  });

  test("hasFeatures allows PLAN_COMPLETED with non-empty features", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    expect(actor.getSnapshot().value).toBe("implement");
  });

  test("allFeaturesCompleted blocks IMPLEMENT_COMPLETED when features are pending", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    // Only complete one of two
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("implement");
  });

  test("allFeaturesCompleted blocks IMPLEMENT_COMPLETED when no features completed", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("implement");
  });

  test("allFeaturesCompleted allows IMPLEMENT_COMPLETED when all features completed", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");
  });
});

// ── 5. CANCEL from every non-terminal state ──────────────────────

describe("CANCEL from every non-terminal state", () => {
  test("CANCEL from design", () => {
    const actor = startActor();
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
    expect(actor.getSnapshot().status).toBe("done");
  });

  test("CANCEL from plan", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
  });

  test("CANCEL from implement", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
  });

  test("CANCEL from validate", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
  });

  test("CANCEL from release", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_COMPLETED" });
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");
  });

});

// ── 6. REGRESS from every non-terminal state ──────────────────────

describe("REGRESS regression", () => {
  test("validate -> implement on REGRESS", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");

    actor.send({ type: "REGRESS", targetPhase: "implement" });
    expect(actor.getSnapshot().value).toBe("implement");
  });

  test("REGRESS to implement resets all features to pending", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().context.features.every((f) => f.status === "completed")).toBe(true);

    actor.send({ type: "REGRESS", targetPhase: "implement" });
    expect(actor.getSnapshot().context.features.every((f) => f.status === "pending")).toBe(true);
    expect(actor.getSnapshot().context.features).toHaveLength(2);
  });

  test("after REGRESS to implement, features must be re-completed before IMPLEMENT_COMPLETED", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "REGRESS", targetPhase: "implement" });

    // Try to skip ahead — should be blocked by allFeaturesCompleted guard
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("implement");

    // Re-complete and proceed
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");
  });

  test("validate -> plan regression", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");

    actor.send({ type: "REGRESS", targetPhase: "plan" });
    expect(actor.getSnapshot().value).toBe("plan");
    // Features reset because regressing past implement
    expect(actor.getSnapshot().context.features.every((f) => f.status === "pending")).toBe(true);
  });

  test("release -> validate regression (features untouched)", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("release");

    actor.send({ type: "REGRESS", targetPhase: "validate" });
    expect(actor.getSnapshot().value).toBe("validate");
    // Features NOT reset — regression doesn't cross implement boundary
    expect(actor.getSnapshot().context.features.every((f) => f.status === "completed")).toBe(true);
  });

  test("release -> implement regression resets features", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("release");

    actor.send({ type: "REGRESS", targetPhase: "implement" });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(actor.getSnapshot().context.features.every((f) => f.status === "pending")).toBe(true);
  });

  test("release -> plan regression resets features", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("release");

    actor.send({ type: "REGRESS", targetPhase: "plan" });
    expect(actor.getSnapshot().value).toBe("plan");
    expect(actor.getSnapshot().context.features.every((f) => f.status === "pending")).toBe(true);
  });

  test("implement -> plan regression", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    expect(actor.getSnapshot().value).toBe("implement");

    actor.send({ type: "REGRESS", targetPhase: "plan" });
    expect(actor.getSnapshot().value).toBe("plan");
  });

  test("same-phase rerun (validate -> validate) is accepted", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");

    actor.send({ type: "REGRESS", targetPhase: "validate" });
    expect(actor.getSnapshot().value).toBe("validate");
  });

  test("same-phase rerun (implement -> implement) resets features", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    expect(actor.getSnapshot().value).toBe("implement");

    actor.send({ type: "REGRESS", targetPhase: "implement" });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(actor.getSnapshot().context.features.every((f) => f.status === "pending")).toBe(true);
  });

  test("same-phase rerun (plan -> plan) is accepted", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("plan");

    actor.send({ type: "REGRESS", targetPhase: "plan" });
    expect(actor.getSnapshot().value).toBe("plan");
  });

  test("REGRESS clears downstream artifacts", () => {
    const ctx = makeContext({
      phase: "validate",
      features: [{ slug: "f", plan: "p", status: "completed" }],
      artifacts: { design: ["d.md"], plan: ["p.md"], implement: ["i.md"], validate: ["v.md"] },
    });
    const resolvedSnapshot = epicMachine.resolveState({
      value: "validate",
      context: ctx,
    });
    const actor = createActor(epicMachine, { snapshot: resolvedSnapshot, input: ctx });
    actor.start();

    actor.send({ type: "REGRESS", targetPhase: "implement" });
    const arts = actor.getSnapshot().context.artifacts;
    expect(arts.design).toEqual(["d.md"]);
    expect(arts.plan).toEqual(["p.md"]);
    expect(arts.implement).toEqual(["i.md"]);
    expect(arts.validate).toBeUndefined();
  });
});

// ── 6b. REGRESS guard conditions ──────────────────────────────────

describe("REGRESS guard conditions", () => {
  test("rejects design as targetPhase", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("plan");

    actor.send({ type: "REGRESS", targetPhase: "design" });
    expect(actor.getSnapshot().value).toBe("plan"); // unchanged
  });

  test("rejects forward jump (plan -> validate)", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("plan");

    actor.send({ type: "REGRESS", targetPhase: "validate" });
    expect(actor.getSnapshot().value).toBe("plan"); // unchanged
  });

  test("rejects forward jump (implement -> release)", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    expect(actor.getSnapshot().value).toBe("implement");

    actor.send({ type: "REGRESS", targetPhase: "release" });
    expect(actor.getSnapshot().value).toBe("implement"); // unchanged
  });
});

// ── 7. Terminal states reject all events ─────────────────────────

describe("terminal states reject all events", () => {
  const allEvents: EpicContext["phase"] extends string ? Array<{ type: string; [k: string]: unknown }> : never = [
    { type: "DESIGN_COMPLETED" },
    { type: "PLAN_COMPLETED", features: twoFeatures },
    { type: "FEATURE_COMPLETED", featureSlug: "feat-a" },
    { type: "IMPLEMENT_COMPLETED" },
    { type: "VALIDATE_COMPLETED" },
    { type: "REGRESS", targetPhase: "plan" },
    { type: "RELEASE_COMPLETED" },
    { type: "CANCEL" },
  ];

  test("done state ignores all events", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_COMPLETED" });
    actor.send({ type: "RELEASE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("done");

    for (const evt of allEvents) {
      actor.send(evt as any);
      expect(actor.getSnapshot().value).toBe("done");
    }
  });

  test("cancelled state ignores all events", () => {
    const actor = startActor();
    actor.send({ type: "CANCEL" });
    expect(actor.getSnapshot().value).toBe("cancelled");

    for (const evt of allEvents) {
      actor.send(evt as any);
      expect(actor.getSnapshot().value).toBe("cancelled");
    }
  });
});

// ── 8. State metadata dispatchType ───────────────────────────────

describe("state metadata dispatchType", () => {
  test("design has dispatchType single", () => {
    const actor = startActor();
    const meta = actor.getSnapshot().getMeta();
    expect(meta["epic.design"]?.dispatchType).toBe("single");
  });

  test("plan has dispatchType single", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    const meta = actor.getSnapshot().getMeta();
    expect(meta["epic.plan"]?.dispatchType).toBe("single");
  });

  test("implement has dispatchType fan-out", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    const meta = actor.getSnapshot().getMeta();
    expect(meta["epic.implement"]?.dispatchType).toBe("fan-out");
  });

  test("validate has dispatchType single", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    const meta = actor.getSnapshot().getMeta();
    expect(meta["epic.validate"]?.dispatchType).toBe("single");
  });

  test("release has dispatchType single", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_COMPLETED" });
    const meta = actor.getSnapshot().getMeta();
    expect(meta["epic.release"]?.dispatchType).toBe("single");
  });

  test("done has dispatchType skip", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: [{ slug: "f", plan: "p" }] });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "f" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    actor.send({ type: "VALIDATE_COMPLETED" });
    actor.send({ type: "RELEASE_COMPLETED" });
    const meta = actor.getSnapshot().getMeta();
    expect(meta["epic.done"]?.dispatchType).toBe("skip");
  });

  test("cancelled has dispatchType skip", () => {
    const actor = startActor();
    actor.send({ type: "CANCEL" });
    const meta = actor.getSnapshot().getMeta();
    expect(meta["epic.cancelled"]?.dispatchType).toBe("skip");
  });
});

// ── 9. Action effects ────────────────────────────────────────────

describe("action effects", () => {
  test("renameSlug changes slug when realSlug provided", () => {
    const actor = startActor({ slug: "old-name" });
    actor.send({ type: "DESIGN_COMPLETED", realSlug: "new-name" });
    expect(actor.getSnapshot().context.slug).toBe("new-name");
  });

  test("renameSlug preserves slug when realSlug omitted", () => {
    const actor = startActor({ slug: "keep-me" });
    actor.send({ type: "DESIGN_COMPLETED" });
    expect(actor.getSnapshot().context.slug).toBe("keep-me");
  });

  test("setFeatures populates features with pending status", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({
      type: "PLAN_COMPLETED",
      features: [
        { slug: "alpha", plan: "plan-alpha" },
        { slug: "beta", plan: "plan-beta" },
      ],
    });
    const features = actor.getSnapshot().context.features;
    expect(features).toHaveLength(2);
    expect(features[0]).toEqual({ slug: "alpha", plan: "plan-alpha", status: "pending" });
    expect(features[1]).toEqual({ slug: "beta", plan: "plan-beta", status: "pending" });
  });

  test("resetFeatures sets all features back to pending via REGRESS", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({ type: "PLAN_COMPLETED", features: twoFeatures });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    // Now in validate with all completed
    actor.send({ type: "REGRESS", targetPhase: "implement" });
    // Back in implement with all pending
    const features = actor.getSnapshot().context.features;
    expect(features[0].status).toBe("pending");
    expect(features[1].status).toBe("pending");
  });

  test("markFeatureCompleted updates only the targeted feature", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({
      type: "PLAN_COMPLETED",
      features: [
        { slug: "a", plan: "pa" },
        { slug: "b", plan: "pb" },
        { slug: "c", plan: "pc" },
      ],
    });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "b" });

    const features = actor.getSnapshot().context.features;
    expect(features[0].status).toBe("pending");
    expect(features[1].status).toBe("completed");
    expect(features[2].status).toBe("pending");
  });

  test("lastUpdated is refreshed on transitions", () => {
    const actor = startActor({ lastUpdated: "2020-01-01T00:00:00Z" });
    const before = actor.getSnapshot().context.lastUpdated;
    expect(before).toBe("2020-01-01T00:00:00Z");

    actor.send({ type: "DESIGN_COMPLETED" });
    const after = actor.getSnapshot().context.lastUpdated;
    expect(after).not.toBe("2020-01-01T00:00:00Z");
    // Should be a valid ISO timestamp
    expect(new Date(after).toISOString()).toBe(after);
  });

  test("setFeatures preserves wave field from PLAN_COMPLETED", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({
      type: "PLAN_COMPLETED",
      features: [
        { slug: "base", plan: "plan-base", wave: 1 },
        { slug: "api", plan: "plan-api", wave: 2 },
        { slug: "ui", plan: "plan-ui", wave: 2 },
      ],
    });
    const features = actor.getSnapshot().context.features;
    expect(features).toHaveLength(3);
    expect(features[0].wave).toBe(1);
    expect(features[1].wave).toBe(2);
    expect(features[2].wave).toBe(2);
  });

  test("setFeatures omits wave when not provided (backwards compat)", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({
      type: "PLAN_COMPLETED",
      features: [
        { slug: "legacy", plan: "plan-legacy" },
      ],
    });
    const features = actor.getSnapshot().context.features;
    expect(features).toHaveLength(1);
    expect(features[0].wave).toBeUndefined();
  });
});
