import { describe, test, expect } from "vitest";
import { createActor } from "xstate";
import { featureMachine } from "../feature";
import type { FeatureContext } from "../types";

function makeContext(overrides: Partial<FeatureContext> = {}): FeatureContext {
  return {
    slug: "test-feature",
    plan: "test-plan.md",
    status: "pending",
    ...overrides,
  };
}

function startActor(ctx?: Partial<FeatureContext>) {
  const actor = createActor(featureMachine, { input: makeContext(ctx) });
  actor.start();
  return actor;
}

describe("featureMachine", () => {
  describe("initial state", () => {
    test("starts in pending", () => {
      const actor = startActor();
      expect(actor.getSnapshot().value).toBe("pending");
    });

    test("preserves input context", () => {
      const actor = startActor({ slug: "my-feat", plan: "my-plan.md" });
      expect(actor.getSnapshot().context.slug).toBe("my-feat");
      expect(actor.getSnapshot().context.plan).toBe("my-plan.md");
    });

    test("preserves optional github context", () => {
      const actor = startActor({ github: { issue: 42 } });
      expect(actor.getSnapshot().context.github?.issue).toBe(42);
    });
  });

  describe("pending state", () => {
    test("START transitions to in-progress", () => {
      const actor = startActor();
      actor.send({ type: "START" });
      expect(actor.getSnapshot().value).toBe("in-progress");
    });

    test("RESET stays in pending", () => {
      const actor = startActor();
      actor.send({ type: "RESET" });
      expect(actor.getSnapshot().value).toBe("pending");
    });

    test("COMPLETE is ignored in pending", () => {
      const actor = startActor();
      actor.send({ type: "COMPLETE" });
      expect(actor.getSnapshot().value).toBe("pending");
    });
  });

  describe("in-progress state", () => {
    test("COMPLETE transitions to completed", () => {
      const actor = startActor();
      actor.send({ type: "START" });
      actor.send({ type: "COMPLETE" });
      expect(actor.getSnapshot().value).toBe("completed");
    });

    test("RESET transitions to pending", () => {
      const actor = startActor();
      actor.send({ type: "START" });
      actor.send({ type: "RESET" });
      expect(actor.getSnapshot().value).toBe("pending");
    });

    test("START is ignored in in-progress", () => {
      const actor = startActor();
      actor.send({ type: "START" });
      actor.send({ type: "START" });
      expect(actor.getSnapshot().value).toBe("in-progress");
    });
  });

  describe("completed state (terminal)", () => {
    test("rejects all events", () => {
      const actor = startActor();
      actor.send({ type: "START" });
      actor.send({ type: "COMPLETE" });
      expect(actor.getSnapshot().value).toBe("completed");
      expect(actor.getSnapshot().status).toBe("done");

      // All events should be ignored
      actor.send({ type: "START" });
      expect(actor.getSnapshot().value).toBe("completed");
      actor.send({ type: "RESET" });
      expect(actor.getSnapshot().value).toBe("completed");
      actor.send({ type: "COMPLETE" });
      expect(actor.getSnapshot().value).toBe("completed");
    });
  });

  describe("state metadata", () => {
    test("pending has dispatchType: skip", () => {
      const actor = startActor();
      const meta = actor.getSnapshot().getMeta() as Record<string, any>;
      expect(meta["feature.pending"].dispatchType).toBe("skip");
    });

    test("in-progress has dispatchType: skip", () => {
      const actor = startActor();
      actor.send({ type: "START" });
      const meta = actor.getSnapshot().getMeta() as Record<string, any>;
      expect(meta["feature.in-progress"].dispatchType).toBe("skip");
    });

    test("completed has dispatchType: skip", () => {
      const actor = startActor();
      actor.send({ type: "START" });
      actor.send({ type: "COMPLETE" });
      const meta = actor.getSnapshot().getMeta() as Record<string, any>;
      expect(meta["feature.completed"].dispatchType).toBe("skip");
    });

  });

  describe("full lifecycle", () => {
    test("pending -> in-progress -> completed", () => {
      const actor = startActor();
      expect(actor.getSnapshot().value).toBe("pending");

      actor.send({ type: "START" });
      expect(actor.getSnapshot().value).toBe("in-progress");

      actor.send({ type: "COMPLETE" });
      expect(actor.getSnapshot().value).toBe("completed");
      expect(actor.getSnapshot().status).toBe("done");
    });

    test("pending -> in-progress -> reset -> in-progress -> completed", () => {
      const actor = startActor();
      expect(actor.getSnapshot().value).toBe("pending");

      actor.send({ type: "START" });
      expect(actor.getSnapshot().value).toBe("in-progress");

      actor.send({ type: "RESET" });
      expect(actor.getSnapshot().value).toBe("pending");

      actor.send({ type: "START" });
      expect(actor.getSnapshot().value).toBe("in-progress");

      actor.send({ type: "COMPLETE" });
      expect(actor.getSnapshot().value).toBe("completed");
      expect(actor.getSnapshot().status).toBe("done");
    });
  });
});
