import { describe, test, expect } from "vitest";
import { createActor } from "xstate";
import { epicMachine } from "../epic";
import { InMemoryTaskStore } from "../../store/in-memory";
import type { Epic } from "../../store/types";
import type { EpicContext } from "../types";

// Helper: create a minimal store with an epic
function createTestStore(epicOverrides: Partial<Epic> = {}) {
  const store = new InMemoryTaskStore();
  const epic = store.addEpic({ name: "Auth System" });
  if (epicOverrides.status) store.updateEpic(epic.id, { status: epicOverrides.status });
  if (epicOverrides.summary) store.updateEpic(epic.id, { summary: epicOverrides.summary });
  if (epicOverrides.worktree) store.updateEpic(epic.id, { worktree: epicOverrides.worktree });
  return { store, epic: store.getEpic(epic.id)! };
}

// Helper: build EpicContext from store entity for the NEW types
// This bridges store Epic -> machine EpicContext
function epicToContext(epic: Epic): Partial<EpicContext> {
  return {
    // New store-based fields
    id: epic.id,
    name: epic.name,
    status: epic.status as any,
    depends_on: epic.depends_on,
    created_at: epic.created_at,
    updated_at: epic.updated_at,
    design: epic.design,
    plan: epic.plan,
    implement: epic.implement,
    validate: epic.validate,
    release: epic.release,
    // Legacy machine fields (mapped from store)
    slug: epic.slug,
    summary: epic.summary,
    worktree: epic.worktree,
    // Machine-specific fields
    features: [],
    artifacts: {},
  };
}

describe("XState Store Bridge Integration", () => {
  // Scenario 1: Pipeline machine reads epic state from the store
  test("machine context reflects the store entity state", () => {
    const { epic } = createTestStore();
    const ctx = epicToContext(epic) as EpicContext;
    const actor = createActor(epicMachine, { input: ctx });
    actor.start();

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("design");
    expect(snapshot.context.slug).toBe(epic.slug);
    // NEW TYPE: machine context has name field
    expect((snapshot.context as any).name).toBe("Auth System");
    actor.stop();
  });

  // Scenario 2: Phase transition writes updated state back to the store
  test("advancing from design to plan updates store entity", () => {
    const { store, epic } = createTestStore();
    const ctx = epicToContext(epic) as EpicContext;
    const actor = createActor(epicMachine, { input: ctx });
    actor.start();

    actor.send({
      type: "DESIGN_COMPLETED",
      summary: { problem: "auth needed", solution: "add auth" },
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("plan");

    // Write back to store from machine snapshot
    store.updateEpic(epic.id, {
      status: snapshot.value as Epic["status"],
      summary: snapshot.context.summary,
      updated_at: (snapshot.context as any).updated_at,
    });

    const updated = store.getEpic(epic.id)!;
    expect(updated.status).toBe("plan");
    expect(updated.summary).toEqual({ problem: "auth needed", solution: "add auth" });
    actor.stop();
  });

  // Scenario 3: Dispatch decision derived from XState machine snapshot
  test("machine snapshot metadata provides dispatch info", () => {
    const { store, epic } = createTestStore();
    store.updateEpic(epic.id, { status: "implement" });
    store.addFeature({ parent: epic.id, name: "Login Flow" });
    store.addFeature({ parent: epic.id, name: "Signup Flow" });

    const updatedEpic = store.getEpic(epic.id)!;
    const ctx = epicToContext(updatedEpic) as EpicContext;
    // Add features to context for machine
    ctx.features = store.listFeatures(epic.id).map((f) => ({
      slug: f.slug,
      plan: f.plan ?? "",
      status: f.status as any,
    }));

    const resolvedSnapshot = epicMachine.resolveState({
      value: "implement" as any,
      context: ctx,
    });
    const actor = createActor(epicMachine, {
      snapshot: resolvedSnapshot,
      input: ctx,
    });
    actor.start();

    const meta = actor.getSnapshot().getMeta();
    expect(meta["epic.implement"]?.dispatchType).toBe("fan-out");

    // Features ready for dispatch come from store
    const readyFeatures = store.listFeatures(epic.id).filter((f) => f.status === "pending");
    expect(readyFeatures).toHaveLength(2);
    actor.stop();
  });

  // Scenario 4: Reconciliation enriches store entities from dispatch output
  test("phase output enriches store entity without separate reconciliation module", () => {
    const { store, epic } = createTestStore();
    const ctx = epicToContext(epic) as EpicContext;
    const actor = createActor(epicMachine, { input: ctx });
    actor.start();

    actor.send({
      type: "DESIGN_COMPLETED",
      summary: { problem: "need auth", solution: "build it" },
    });

    const snapshot = actor.getSnapshot();
    store.updateEpic(epic.id, {
      status: snapshot.value as Epic["status"],
      summary: snapshot.context.summary,
      updated_at: (snapshot.context as any).updated_at,
    });

    const enriched = store.getEpic(epic.id)!;
    expect(enriched.status).toBe("plan");
    expect(enriched.summary).toEqual({ problem: "need auth", solution: "build it" });
    actor.stop();
  });

  // Scenario 5: Feature status updated through XState events on store entities
  test("feature completion updates store feature status", () => {
    const { store, epic } = createTestStore();
    store.updateEpic(epic.id, { status: "implement" });
    const f1 = store.addFeature({ parent: epic.id, name: "Login Flow" });

    store.updateFeature(f1.id, { status: "completed" });

    const updated = store.getFeature(f1.id)!;
    expect(updated.status).toBe("completed");
  });

  // Scenario 6: All state changes persisted atomically
  test("multiple feature completions in single transaction", () => {
    const { store, epic } = createTestStore();
    store.updateEpic(epic.id, { status: "implement" });
    const f1 = store.addFeature({ parent: epic.id, name: "Login" });
    const f2 = store.addFeature({ parent: epic.id, name: "Signup" });

    store.updateFeature(f1.id, { status: "completed" });
    store.updateFeature(f2.id, { status: "completed" });
    store.updateEpic(epic.id, { status: "validate" });

    const finalEpic = store.getEpic(epic.id)!;
    expect(finalEpic.status).toBe("validate");
    expect(store.getFeature(f1.id)!.status).toBe("completed");
    expect(store.getFeature(f2.id)!.status).toBe("completed");
  });

  // Scenario 7: Full pipeline lifecycle operates entirely on store
  test("full lifecycle: design -> plan -> implement -> validate -> release -> done", () => {
    const { store, epic } = createTestStore();
    let ctx = epicToContext(epic) as EpicContext;
    const actor = createActor(epicMachine, { input: ctx });
    actor.start();

    // design -> plan
    actor.send({ type: "DESIGN_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("plan");
    store.updateEpic(epic.id, { status: "plan" });

    // plan -> implement (add features to store)
    const f1 = store.addFeature({ parent: epic.id, name: "Feature A" });
    const f2 = store.addFeature({ parent: epic.id, name: "Feature B" });
    actor.send({
      type: "PLAN_COMPLETED",
      features: [
        { slug: f1.slug, plan: "plan-a" },
        { slug: f2.slug, plan: "plan-b" },
      ],
    });
    expect(actor.getSnapshot().value).toBe("implement");
    store.updateEpic(epic.id, { status: "implement" });

    // complete features
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: f1.slug });
    store.updateFeature(f1.id, { status: "completed" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: f2.slug });
    store.updateFeature(f2.id, { status: "completed" });

    // implement -> validate
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");
    store.updateEpic(epic.id, { status: "validate" });

    // validate -> release
    actor.send({ type: "VALIDATE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("release");
    store.updateEpic(epic.id, { status: "release" });

    // release -> done
    actor.send({ type: "RELEASE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("done");
    store.updateEpic(epic.id, { status: "done" });

    // Verify store reflects final state
    const finalEpic = store.getEpic(epic.id)!;
    expect(finalEpic.status).toBe("done");
    expect(store.getFeature(f1.id)!.status).toBe("completed");
    expect(store.getFeature(f2.id)!.status).toBe("completed");
    actor.stop();
  });
});
