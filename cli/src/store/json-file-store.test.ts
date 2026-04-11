import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { JsonFileStore } from "./json-file-store.js";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

describe("JsonFileStore", () => {
  let storeDir: string;
  let storePath: string;
  let store: JsonFileStore;

  beforeEach(() => {
    storeDir = resolve(tmpdir(), `beastmode-test-${randomUUID()}`);
    mkdirSync(storeDir, { recursive: true });
    storePath = resolve(storeDir, "store.json");
    store = new JsonFileStore(storePath);
  });

  afterEach(() => {
    rmSync(storeDir, { recursive: true, force: true });
  });

  describe("load/save round-trip", () => {
    it("should create store file on first save", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      store.save();

      expect(existsSync(storePath)).toBe(true);

      const raw = JSON.parse(readFileSync(storePath, "utf-8"));
      expect(raw.version).toBe(1);
      expect(raw.entities[epic.id]).toBeDefined();
      expect(raw.entities[epic.id].name).toBe("Test Epic");
    });

    it("should load existing store from file", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      const feature = store.addFeature({ parent: epic.id, name: "Feature 1" });
      store.save();

      // Create new store instance pointing to same file
      const store2 = new JsonFileStore(storePath);
      store2.load();

      const loadedEpic = store2.getEpic(epic.id);
      expect(loadedEpic).toBeDefined();
      expect(loadedEpic!.name).toBe("Test Epic");

      const loadedFeature = store2.getFeature(feature.id);
      expect(loadedFeature).toBeDefined();
      expect(loadedFeature!.name).toBe("Feature 1");
      expect(loadedFeature!.parent).toBe(epic.id);
    });

    it("should preserve all entity fields through save/load", () => {
      const epic = store.addEpic({ name: "My Epic" });
      store.updateEpic(epic.id, {
        status: "implement",
        summary: "A summary",
        design: "artifacts/design/2026-04-04-my-epic.md",
        depends_on: [],
        worktree: { branch: "feature/my-epic", path: ".claude/worktrees/my-epic" },
      });

      const feature = store.addFeature({ parent: epic.id, name: "Feature", description: "Desc" });
      store.updateFeature(feature.id, {
        status: "in-progress",
        plan: "artifacts/plan/2026-04-04-my-epic-feature.md",
        depends_on: [],
      });

      store.save();

      const store2 = new JsonFileStore(storePath);
      store2.load();

      const e = store2.getEpic(epic.id)!;
      expect(e.status).toBe("implement");
      expect(e.summary).toBe("A summary");
      expect(e.design).toBe("artifacts/design/2026-04-04-my-epic.md");
      expect(e.worktree).toEqual({ branch: "feature/my-epic", path: ".claude/worktrees/my-epic" });

      const f = store2.getFeature(feature.id)!;
      expect(f.status).toBe("in-progress");
      expect(f.plan).toBe("artifacts/plan/2026-04-04-my-epic-feature.md");
      expect(f.description).toBe("Desc");
    });

    it("should handle load when file does not exist (empty store)", () => {
      store.load(); // Should not throw
      expect(store.listEpics()).toEqual([]);
    });

    it("should create parent directory on save if needed", () => {
      const nestedPath = resolve(storeDir, "nested", "deep", "store.json");
      const nestedStore = new JsonFileStore(nestedPath);
      nestedStore.addEpic({ name: "Epic" });
      nestedStore.save();
      expect(existsSync(nestedPath)).toBe(true);
    });
  });

  describe("Epic CRUD", () => {
    it("should add epic with auto-generated ID", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      expect(epic.id).toMatch(/^bm-[0-9a-f]{4}$/);
      expect(epic.name).toBe("Test Epic");
      expect(epic.slug).toMatch(/^test-epic-[0-9a-f]{4}$/);
      expect(epic.status).toBe("design");
      expect(epic.type).toBe("epic");
      expect(epic.depends_on).toEqual([]);
    });

    it("should get, update, delete epic", () => {
      const epic = store.addEpic({ name: "Epic" });
      expect(store.getEpic(epic.id)).toBeDefined();

      const updated = store.updateEpic(epic.id, { status: "plan" });
      expect(updated.status).toBe("plan");

      store.deleteEpic(epic.id);
      expect(store.getEpic(epic.id)).toBeUndefined();
    });

    it("should list all epics", () => {
      store.addEpic({ name: "Epic 1" });
      store.addEpic({ name: "Epic 2" });
      expect(store.listEpics()).toHaveLength(2);
    });

    it("should delete child features when deleting epic", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feat = store.addFeature({ parent: epic.id, name: "Feat" });
      store.deleteEpic(epic.id);
      expect(store.getFeature(feat.id)).toBeUndefined();
    });
  });

  describe("Feature CRUD", () => {
    it("should add feature with hierarchical ID", () => {
      const epic = store.addEpic({ name: "Epic" });
      const f1 = store.addFeature({ parent: epic.id, name: "Feature 1" });
      const f2 = store.addFeature({ parent: epic.id, name: "Feature 2" });
      expect(f1.id).toBe(`${epic.id}.1`);
      expect(f2.id).toBe(`${epic.id}.2`);
      expect(f1.type).toBe("feature");
      expect(f1.parent).toBe(epic.id);
      expect(f1.status).toBe("pending");
    });

    it("should get, update, delete feature", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feat = store.addFeature({ parent: epic.id, name: "Feat" });
      expect(store.getFeature(feat.id)).toBeDefined();

      const updated = store.updateFeature(feat.id, { status: "in-progress" });
      expect(updated.status).toBe("in-progress");

      store.deleteFeature(feat.id);
      expect(store.getFeature(feat.id)).toBeUndefined();
    });

    it("should list features for a specific epic", () => {
      const e1 = store.addEpic({ name: "E1" });
      const e2 = store.addEpic({ name: "E2" });
      store.addFeature({ parent: e1.id, name: "F1" });
      store.addFeature({ parent: e2.id, name: "F2" });
      expect(store.listFeatures(e1.id)).toHaveLength(1);
      expect(store.listFeatures(e2.id)).toHaveLength(1);
    });

    it("should throw when adding feature to non-existent epic", () => {
      expect(() => store.addFeature({ parent: "bm-0000", name: "X" })).toThrow();
    });

    it("should continue sequential IDs after load", () => {
      const epic = store.addEpic({ name: "Epic" });
      store.addFeature({ parent: epic.id, name: "F1" });
      store.addFeature({ parent: epic.id, name: "F2" });
      store.save();

      const store2 = new JsonFileStore(storePath);
      store2.load();
      const f3 = store2.addFeature({ parent: epic.id, name: "F3" });
      expect(f3.id).toBe(`${epic.id}.3`);
    });
  });

  describe("Queries", () => {
    it("should find entity by ID", () => {
      const epic = store.addEpic({ name: "Epic" });
      expect(store.find(epic.id)).toEqual(epic);
    });

    it("should find epic by slug", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      expect(store.find(epic.slug)).toEqual(epic);
    });

    it("should return undefined for unknown", () => {
      expect(store.find("nope")).toBeUndefined();
    });

    it("should return blocked entities", () => {
      const epic = store.addEpic({ name: "Epic" });
      const f1 = store.addFeature({ parent: epic.id, name: "F1" });
      store.updateFeature(f1.id, { status: "blocked" });
      const blocked = store.blocked();
      expect(blocked).toHaveLength(1);
      expect(blocked[0].id).toBe(f1.id);
    });

    it("should build tree hierarchy", () => {
      const epic = store.addEpic({ name: "Epic" });
      store.addFeature({ parent: epic.id, name: "F1" });
      store.addFeature({ parent: epic.id, name: "F2" });
      const tree = store.tree();
      expect(tree.length).toBeGreaterThanOrEqual(1);
      const node = tree.find((n) => n.entity.id === epic.id);
      expect(node?.children).toHaveLength(2);
    });

    it("should return ready features (no unresolved deps, parent not cancelled)", () => {
      const epic = store.addEpic({ name: "Epic" });
      store.addFeature({ parent: epic.id, name: "F1" }); // pending, no deps
      const ready = store.ready({ type: "feature" });
      expect(ready).toHaveLength(1);
    });

    it("should exclude features with unresolved deps from ready", () => {
      const epic = store.addEpic({ name: "Epic" });
      const f1 = store.addFeature({ parent: epic.id, name: "F1" });
      const f2 = store.addFeature({ parent: epic.id, name: "F2" });
      store.updateFeature(f2.id, { depends_on: [f1.id] });
      const ready = store.ready({ type: "feature" });
      expect(ready).toHaveLength(1);
      expect(ready[0].id).toBe(f1.id);
    });
  });

  describe("Dependency graph", () => {
    it("should compute wave 1 for entity with no deps", () => {
      const epic = store.addEpic({ name: "Epic" });
      expect(store.computeWave(epic.id)).toBe(1);
    });

    it("should compute wave based on dependency depth", () => {
      const e1 = store.addEpic({ name: "E1" });
      const e2 = store.addEpic({ name: "E2" });
      const e3 = store.addEpic({ name: "E3" });
      store.updateEpic(e2.id, { depends_on: [e1.id] });
      store.updateEpic(e3.id, { depends_on: [e2.id] });
      expect(store.computeWave(e1.id)).toBe(1);
      expect(store.computeWave(e2.id)).toBe(2);
      expect(store.computeWave(e3.id)).toBe(3);
    });

    it("should return dependency chain in topological order", () => {
      const e1 = store.addEpic({ name: "E1" });
      const e2 = store.addEpic({ name: "E2" });
      store.updateEpic(e2.id, { depends_on: [e1.id] });
      const chain = store.dependencyChain(e2.id);
      expect(chain.map((e) => e.id)).toEqual([e1.id, e2.id]);
    });

    it("should detect cycles", () => {
      const e1 = store.addEpic({ name: "E1" });
      const e2 = store.addEpic({ name: "E2" });
      store.updateEpic(e1.id, { depends_on: [e2.id] });
      store.updateEpic(e2.id, { depends_on: [e1.id] });
      const cycles = store.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it("should detect no cycles in acyclic graph", () => {
      const e1 = store.addEpic({ name: "E1" });
      const e2 = store.addEpic({ name: "E2" });
      store.updateEpic(e2.id, { depends_on: [e1.id] });
      expect(store.detectCycles()).toHaveLength(0);
    });
  });

  describe("transact() — async mutex", () => {
    it("should serialize concurrent mutations", async () => {
      // Pre-populate
      store.addEpic({ name: "Epic" });
      store.save();

      const store2 = new JsonFileStore(storePath);

      // Fire 10 concurrent transact calls that each add an epic
      const promises = Array.from({ length: 10 }, (_, i) =>
        store2.transact((s) => {
          s.addEpic({ name: `Concurrent Epic ${i}` });
        })
      );

      await Promise.all(promises);

      // Reload and verify all 11 epics exist (1 original + 10 concurrent)
      const store3 = new JsonFileStore(storePath);
      store3.load();
      expect(store3.listEpics()).toHaveLength(11);
    });

    it("should reload from disk on each transact call", async () => {
      // Store1 adds an epic and saves
      store.addEpic({ name: "Epic From Store 1" });
      store.save();

      // Store2 transacts — should see Store1's epic
      const store2 = new JsonFileStore(storePath);
      await store2.transact((s) => {
        const epics = s.listEpics();
        expect(epics).toHaveLength(1);
        expect(epics[0].name).toBe("Epic From Store 1");
        s.addEpic({ name: "Epic From Store 2" });
      });

      // Verify both epics persisted
      const store3 = new JsonFileStore(storePath);
      store3.load();
      expect(store3.listEpics()).toHaveLength(2);
    });

    it("should not save if transact callback throws", async () => {
      store.addEpic({ name: "Existing" });
      store.save();

      const store2 = new JsonFileStore(storePath);
      await expect(
        store2.transact(() => {
          throw new Error("Oops");
        })
      ).rejects.toThrow("Oops");

      // Original data should be unchanged
      const store3 = new JsonFileStore(storePath);
      store3.load();
      expect(store3.listEpics()).toHaveLength(1);
      expect(store3.listEpics()[0].name).toBe("Existing");
    });
  });
});
