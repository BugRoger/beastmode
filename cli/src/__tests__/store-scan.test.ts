import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";
import { listEnrichedFromStore } from "../store/scan.js";

describe("listEnrichedFromStore", () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  it("returns empty array for empty store", () => {
    const result = listEnrichedFromStore(store);
    expect(result).toEqual([]);
  });

  it("returns enriched epics with nextAction for plan phase", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "plan" });

    const result = listEnrichedFromStore(store);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("test-epic");
    expect(result[0].nextAction).toEqual({
      phase: "plan",
      args: ["test-epic"],
      type: "single",
    });
  });

  it("returns fan-out nextAction for implement phase with pending features", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "implement" });
    store.addFeature({ parent: epic.id, name: "F1", slug: "f1" });
    store.addFeature({ parent: epic.id, name: "F2", slug: "f2" });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction).toEqual({
      phase: "implement",
      args: ["test-epic"],
      type: "fan-out",
      features: ["f1", "f2"],
    });
  });

  it("returns null nextAction for done phase", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "done" });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction).toBeNull();
  });

  it("returns null nextAction for cancelled phase", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "cancelled" });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction).toBeNull();
  });

  it("skips completed features in fan-out", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "implement" });
    const f1 = store.addFeature({ parent: epic.id, name: "F1", slug: "f1" });
    store.updateFeature(f1.id, { status: "completed" });
    store.addFeature({ parent: epic.id, name: "F2", slug: "f2" });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction!.features).toEqual(["f2"]);
  });

  it("returns null nextAction when all features completed", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "implement" });
    const f1 = store.addFeature({ parent: epic.id, name: "F1", slug: "f1" });
    store.updateFeature(f1.id, { status: "completed" });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction).toBeNull();
  });

  it("returns design phase as skip (null nextAction)", () => {
    store.addEpic({ name: "Test", slug: "test-epic" });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction).toBeNull();
  });

  it("wave-aware: only dispatches lowest wave features", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "implement" });

    const f1 = store.addFeature({ parent: epic.id, name: "F1", slug: "f1" });
    const f2 = store.addFeature({ parent: epic.id, name: "F2", slug: "f2" });
    store.updateFeature(f2.id, { depends_on: [f1.id] });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction!.features).toEqual(["f1"]);
  });

  it("includes features array on enriched epic", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "implement" });
    store.addFeature({ parent: epic.id, name: "F1", slug: "f1" });

    const result = listEnrichedFromStore(store);
    expect(result[0].features).toHaveLength(1);
    expect(result[0].features[0].slug).toBe("f1");
  });
});
