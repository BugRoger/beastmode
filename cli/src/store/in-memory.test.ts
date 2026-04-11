/**
 * Tests for InMemoryTaskStore
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { InMemoryTaskStore } from "./in-memory.js";
import { Epic, Feature } from "./types.js";

describe("InMemoryTaskStore", () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  describe("Epic CRUD", () => {
    it("should add an epic with auto-generated ID", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      expect(epic.id).toMatch(/^bm-[0-9a-f]{4}$/);
      expect(epic.name).toBe("Test Epic");
      expect(epic.slug).toMatch(/^test-epic-[0-9a-f]{4}$/);
      expect(epic.status).toBe("design");
      expect(epic.depends_on).toEqual([]);
    });

    it("should generate unique epic IDs", () => {
      const epic1 = store.addEpic({ name: "Epic 1" });
      const epic2 = store.addEpic({ name: "Epic 2" });
      expect(epic1.id).not.toBe(epic2.id);
    });

    it("should get epic by ID", () => {
      const added = store.addEpic({ name: "Test Epic" });
      const retrieved = store.getEpic(added.id);
      expect(retrieved).toEqual(added);
    });

    it("should return undefined for non-existent epic", () => {
      expect(store.getEpic("bm-0000")).toBeUndefined();
    });

    it("should list all epics", () => {
      store.addEpic({ name: "Epic 1" });
      store.addEpic({ name: "Epic 2" });
      const epics = store.listEpics();
      expect(epics).toHaveLength(2);
    });

    it("should update an epic", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      const updated = store.updateEpic(epic.id, { status: "plan" });
      expect(updated.status).toBe("plan");
      expect(updated.name).toBe("Test Epic"); // unchanged
      expect(store.getEpic(epic.id)).toEqual(updated);
    });

    it("should throw on update non-existent epic", () => {
      expect(() => store.updateEpic("bm-0000", {})).toThrow();
    });

    it("should delete an epic", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      store.deleteEpic(epic.id);
      expect(store.getEpic(epic.id)).toBeUndefined();
    });

    it("should delete child features when deleting epic", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      const feature = store.addFeature({
        parent: epic.id,
        name: "Test Feature",
      });
      store.deleteEpic(epic.id);
      expect(store.getFeature(feature.id)).toBeUndefined();
    });

    it("should throw on delete non-existent epic", () => {
      expect(() => store.deleteEpic("bm-0000")).toThrow();
    });

    it("should allow slug mutation via updateEpic", () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "old-slug" });
      const updated = store.updateEpic(epic.id, { slug: "new-slug" });
      expect(updated.slug).toBe("new-slug");
      expect(store.getEpic(epic.id)!.slug).toBe("new-slug");
    });

    it("should make epic findable by new slug after slug mutation", () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "old-slug" });
      store.updateEpic(epic.id, { slug: "new-slug" });
      expect(store.find("new-slug")).toBeDefined();
      expect(store.find("new-slug")!.id).toBe(epic.id);
      expect(store.find("old-slug")).toBeUndefined();
    });
  });

  describe("Feature CRUD", () => {
    let epic: Epic;

    beforeEach(() => {
      epic = store.addEpic({ name: "Test Epic" });
    });

    it("should add a feature with sequential ID", () => {
      const feature = store.addFeature({
        parent: epic.id,
        name: "Test Feature",
      });
      expect(feature.id).toBe(`${epic.id}.1`);
      expect(feature.name).toBe("Test Feature");
      expect(feature.parent).toBe(epic.id);
      expect(feature.status).toBe("pending");
      expect(feature.depends_on).toEqual([]);
    });

    it("should auto-increment feature IDs", () => {
      const f1 = store.addFeature({
        parent: epic.id,
        name: "Feature 1",
      });
      const f2 = store.addFeature({
        parent: epic.id,
        name: "Feature 2",
      });
      expect(f1.id).toBe(`${epic.id}.1`);
      expect(f2.id).toBe(`${epic.id}.2`);
    });

    it("should throw when adding feature to non-existent epic", () => {
      expect(() =>
        store.addFeature({ parent: "bm-0000", name: "Feature" })
      ).toThrow();
    });

    it("should get feature by ID", () => {
      const added = store.addFeature({
        parent: epic.id,
        name: "Test Feature",
      });
      const retrieved = store.getFeature(added.id);
      expect(retrieved).toEqual(added);
    });

    it("should list features for an epic", () => {
      store.addFeature({ parent: epic.id, name: "Feature 1" });
      store.addFeature({ parent: epic.id, name: "Feature 2" });
      const features = store.listFeatures(epic.id);
      expect(features).toHaveLength(2);
    });

    it("should update a feature", () => {
      const feature = store.addFeature({
        parent: epic.id,
        name: "Test Feature",
      });
      const updated = store.updateFeature(feature.id, {
        status: "in-progress",
      });
      expect(updated.status).toBe("in-progress");
      expect(store.getFeature(feature.id)).toEqual(updated);
    });

    it("should delete a feature", () => {
      const feature = store.addFeature({
        parent: epic.id,
        name: "Test Feature",
      });
      store.deleteFeature(feature.id);
      expect(store.getFeature(feature.id)).toBeUndefined();
    });

    it("should derive slug from name with ordinal suffix", () => {
      const feature = store.addFeature({
        parent: epic.id,
        name: "Login Flow",
      });
      expect(feature.slug).toBe("login-flow-1");
    });
  });

  describe("ready()", () => {
    let epic: Epic;

    beforeEach(() => {
      epic = store.addEpic({ name: "Test Epic" });
    });

    it("should return epics with status design", () => {
      store.addEpic({ name: "Design Epic" }); // status: design
      const planEpic = store.addEpic({ name: "Plan Epic" });
      store.updateEpic(planEpic.id, { status: "plan" });

      const ready = store.ready({ type: "epic" });
      expect(ready).toHaveLength(2);
      const designEpics = ready.filter((e) => (e as Epic).status === "design");
      expect(designEpics).toHaveLength(2);
    });

    it("should return features with status pending", () => {
      store.addFeature({ parent: epic.id, name: "Pending Feature" }); // status: pending
      const feature2 = store.addFeature({
        parent: epic.id,
        name: "In Progress Feature",
      });
      store.updateFeature(feature2.id, { status: "in-progress" });

      const ready = store.ready({ type: "feature" });
      expect(ready).toHaveLength(1);
      expect(ready[0].type).toBe("feature");
      expect(ready[0].status).toBe("pending");
    });

    it("should filter by epicId", () => {
      const epic1 = store.addEpic({ name: "Epic 1" });
      const epic2 = store.addEpic({ name: "Epic 2" });

      store.addFeature({ parent: epic1.id, name: "Feature 1" });
      store.addFeature({ parent: epic2.id, name: "Feature 2" });

      const ready = store.ready({ epicId: epic1.id, type: "feature" });
      expect(ready).toHaveLength(1);
      expect((ready[0] as Feature).parent).toBe(epic1.id);
    });

    it("should exclude features with cancelled parent", () => {
      store.addFeature({ parent: epic.id, name: "Feature 1" });
      store.updateEpic(epic.id, { status: "cancelled" });

      const ready = store.ready({ type: "feature" });
      expect(ready).toHaveLength(0);
    });

    it("should exclude features with done parent", () => {
      store.addFeature({ parent: epic.id, name: "Feature 1" });
      store.updateEpic(epic.id, { status: "done" });

      const ready = store.ready({ type: "feature" });
      expect(ready).toHaveLength(0);
    });

    it("should exclude entities with unresolved dependencies", () => {
      const epic1 = store.addEpic({ name: "Epic 1" });
      const epic2 = store.addEpic({ name: "Epic 2" });

      // epic2 depends on epic1, but epic1 is still in design (not done)
      store.updateEpic(epic2.id, { depends_on: [epic1.id] });

      const ready = store.ready({ type: "epic" });
      expect(ready.map((e) => (e as Epic).id)).toContain(epic1.id);
      expect(ready.map((e) => (e as Epic).id)).not.toContain(epic2.id);
    });

    it("should include entities when all dependencies are resolved", () => {
      const epic1 = store.addEpic({ name: "Epic 1" });
      const epic2 = store.addEpic({ name: "Epic 2" });

      store.updateEpic(epic2.id, { depends_on: [epic1.id] });
      store.updateEpic(epic1.id, { status: "done" });

      const ready = store.ready({ type: "epic" });
      expect(ready.map((e) => (e as Epic).id)).toContain(epic2.id);
    });
  });

  describe("blocked()", () => {
    it("should return all blocked entities", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      store.addFeature({ parent: epic.id, name: "Feature 1" });
      const f2 = store.addFeature({ parent: epic.id, name: "Feature 2" });

      store.updateFeature(f2.id, { status: "blocked" });

      const blocked = store.blocked();
      expect(blocked).toHaveLength(1);
      expect(blocked[0].id).toBe(f2.id);
    });
  });

  describe("tree()", () => {
    it("should return hierarchical tree of all epics and features", () => {
      const epic1 = store.addEpic({ name: "Epic 1" });
      store.addEpic({ name: "Epic 2" });
      const f1 = store.addFeature({ parent: epic1.id, name: "Feature 1" });
      const f2 = store.addFeature({ parent: epic1.id, name: "Feature 2" });

      const tree = store.tree();
      expect(tree).toHaveLength(2);

      const node1 = tree.find((n) => n.entity.id === epic1.id);
      expect(node1?.children).toHaveLength(2);
      expect(node1?.children.map((c) => c.entity.id)).toContain(f1.id);
      expect(node1?.children.map((c) => c.entity.id)).toContain(f2.id);
    });

    it("should return subtree for specified rootId", () => {
      const epic = store.addEpic({ name: "Epic" });
      store.addFeature({ parent: epic.id, name: "Feature 1" });
      store.addFeature({ parent: epic.id, name: "Feature 2" });

      const tree = store.tree(epic.id);
      expect(tree).toHaveLength(1);
      expect(tree[0].entity.id).toBe(epic.id);
      expect(tree[0].children).toHaveLength(2);
    });

    it("should return feature without children", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feature = store.addFeature({ parent: epic.id, name: "Feature" });

      const tree = store.tree(feature.id);
      expect(tree).toHaveLength(1);
      expect(tree[0].entity.id).toBe(feature.id);
      expect(tree[0].children).toHaveLength(0);
    });
  });

  describe("find()", () => {
    it("should find epic by ID", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      expect(store.find(epic.id)).toEqual(epic);
    });

    it("should find feature by ID", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feature = store.addFeature({
        parent: epic.id,
        name: "Feature",
      });
      expect(store.find(feature.id)).toEqual(feature);
    });

    it("should find epic by slug", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      expect(store.find(epic.slug)).toEqual(epic);
    });

    it("should return undefined for non-existent", () => {
      expect(store.find("nonexistent")).toBeUndefined();
    });
  });

  describe("find by feature slug", () => {
    it("should find feature by slug", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      const feature = store.addFeature({ parent: epic.id, name: "Login Flow" });
      const found = store.find(feature.slug);
      expect(found).toBeDefined();
      expect(found!.id).toBe(feature.id);
    });

    it("should prefer epic slug over feature slug", () => {
      const epic = store.addEpic({ name: "Auth" });
      // Feature slug won't collide with epic slug since they have different suffixes
      store.addFeature({ parent: epic.id, name: "Auth Feature" });
      // Find by epic slug should return the epic
      const found = store.find(epic.slug);
      expect(found).toBeDefined();
      expect(found!.type).toBe("epic");
    });

    it("should find feature slug when no epic slug matches", () => {
      const epic = store.addEpic({ name: "My Epic" });
      const feature = store.addFeature({ parent: epic.id, name: "Auth Feature" });
      const found = store.find(feature.slug);
      expect(found).toBeDefined();
      expect(found!.type).toBe("feature");
    });
  });

  describe("dependencyChain()", () => {
    it("should return single entity with no dependencies", () => {
      const epic = store.addEpic({ name: "Epic" });
      const chain = store.dependencyChain(epic.id);
      expect(chain).toEqual([epic]);
    });

    it("should return topologically ordered dependencies", () => {
      const epic1 = store.addEpic({ name: "Epic 1" });
      const epic2 = store.addEpic({ name: "Epic 2" });
      const epic3 = store.addEpic({ name: "Epic 3" });

      // epic2 -> epic1, epic3 -> epic2
      store.updateEpic(epic2.id, { depends_on: [epic1.id] });
      store.updateEpic(epic3.id, { depends_on: [epic2.id] });

      const chain = store.dependencyChain(epic3.id);
      expect(chain.map((e) => (e as Epic).id)).toEqual([
        epic1.id,
        epic2.id,
        epic3.id,
      ]);
    });
  });

  describe("computeWave()", () => {
    it("should return 1 for entity with no dependencies", () => {
      const epic = store.addEpic({ name: "Epic" });
      expect(store.computeWave(epic.id)).toBe(1);
    });

    it("should return 2 for entity depending on wave 1 entity", () => {
      const epic1 = store.addEpic({ name: "Epic 1" });
      const epic2 = store.addEpic({ name: "Epic 2" });
      store.updateEpic(epic2.id, { depends_on: [epic1.id] });
      expect(store.computeWave(epic2.id)).toBe(2);
    });

    it("should compute max depth of dependency tree", () => {
      const epic1 = store.addEpic({ name: "Epic 1" });
      const epic2 = store.addEpic({ name: "Epic 2" });
      const epic3 = store.addEpic({ name: "Epic 3" });

      store.updateEpic(epic2.id, { depends_on: [epic1.id] });
      store.updateEpic(epic3.id, { depends_on: [epic2.id] });

      expect(store.computeWave(epic3.id)).toBe(3);
    });
  });

  describe("detectCycles()", () => {
    it("should return empty array for acyclic graph", () => {
      const epic1 = store.addEpic({ name: "Epic 1" });
      const epic2 = store.addEpic({ name: "Epic 2" });
      store.updateEpic(epic2.id, { depends_on: [epic1.id] });

      const cycles = store.detectCycles();
      expect(cycles).toHaveLength(0);
    });

    it("should detect self-cycle", () => {
      const epic = store.addEpic({ name: "Epic" });
      store.updateEpic(epic.id, { depends_on: [epic.id] });

      const cycles = store.detectCycles();
      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain(epic.id);
    });

    it("should detect multi-node cycle", () => {
      const epic1 = store.addEpic({ name: "Epic 1" });
      const epic2 = store.addEpic({ name: "Epic 2" });

      store.updateEpic(epic1.id, { depends_on: [epic2.id] });
      store.updateEpic(epic2.id, { depends_on: [epic1.id] });

      const cycles = store.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe("load/save", () => {
    it("should be no-op for in-memory store", () => {
      const epic = store.addEpic({ name: "Epic" });
      store.save();
      store.load();

      // Epic should still exist
      expect(store.getEpic(epic.id)).toEqual(epic);
    });
  });
});
