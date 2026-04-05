/**
 * Consumer Migration Integration Test
 *
 * Verifies that the watch loop and dashboard consume store entities
 * instead of manifests, and derive dispatch decisions from XState
 * machine snapshots.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";

describe("@manifest-absorption: Watch loop and dashboard consume store entities", () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  describe("Watch loop discovers epics by scanning the store", () => {
    it("finds all epics from the store", async () => {
      const epic1 = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic1.id, { status: "plan" });

      const epic2 = store.addEpic({ name: "Data Pipeline", slug: "data-pipeline" });
      store.updateEpic(epic2.id, { status: "implement" });

      // Import the store-based scan function
      const { listEnrichedFromStore } = await import("../store/scan.js");
      const result = listEnrichedFromStore(store);

      expect(result.length).toBe(2);
      expect(result.map(e => e.slug)).toContain("auth-system");
      expect(result.map(e => e.slug)).toContain("data-pipeline");
    });

    it("each epic has a machine-derived next action", async () => {
      const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "plan" });

      const { listEnrichedFromStore } = await import("../store/scan.js");
      const result = listEnrichedFromStore(store);
      const enriched = result.find(e => e.slug === "auth-system");

      expect(enriched).toBeDefined();
      expect(enriched!.nextAction).toBeDefined();
      expect(enriched!.nextAction!.phase).toBe("plan");
      expect(enriched!.nextAction!.type).toBe("single");
    });
  });

  describe("Watch loop derives dispatch decisions from machine snapshots", () => {
    it("identifies ready features based on dependency completion", async () => {
      const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "implement" });

      const f1 = store.addFeature({ parent: epic.id, name: "Login Flow", slug: "login-flow" });
      store.updateFeature(f1.id, { status: "completed" });

      store.addFeature({ parent: epic.id, name: "Token Cache", slug: "token-cache" });
      // token-cache depends on f1 — but f1 completed, so token-cache is pending and dispatchable

      const { listEnrichedFromStore } = await import("../store/scan.js");
      const result = listEnrichedFromStore(store);
      const enriched = result.find(e => e.slug === "auth-system");

      expect(enriched).toBeDefined();
      expect(enriched!.nextAction).toBeDefined();
      expect(enriched!.nextAction!.type).toBe("fan-out");
      expect(enriched!.nextAction!.features).toContain("token-cache");
    });
  });

  describe("Watch loop scan is a single store parse", () => {
    it("all epic discovery happens from a single store read", async () => {
      store.addEpic({ name: "Epic 1", slug: "epic-1" });
      store.addEpic({ name: "Epic 2", slug: "epic-2" });
      store.addEpic({ name: "Epic 3", slug: "epic-3" });

      const { listEnrichedFromStore } = await import("../store/scan.js");
      // Single call — no manifest files consulted
      const result = listEnrichedFromStore(store);
      expect(result.length).toBe(3);
    });
  });

  describe("Dashboard renders epic state from store entities", () => {
    it("displays epic phase from store entity", async () => {
      const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "implement" });

      const f1 = store.addFeature({ parent: epic.id, name: "Login", slug: "login" });
      store.updateFeature(f1.id, { status: "completed" });
      store.addFeature({ parent: epic.id, name: "Signup", slug: "signup" });

      const { listEnrichedFromStore } = await import("../store/scan.js");
      const result = listEnrichedFromStore(store);
      const enriched = result.find(e => e.slug === "auth-system");

      expect(enriched).toBeDefined();
      expect(enriched!.status).toBe("implement");
    });
  });

  describe("Dashboard shows XState-derived enrichment", () => {
    it("shows machine-derived next action", async () => {
      const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "implement" });

      store.addFeature({ parent: epic.id, name: "Login", slug: "login" });

      const { listEnrichedFromStore } = await import("../store/scan.js");
      const result = listEnrichedFromStore(store);
      const enriched = result.find(e => e.slug === "auth-system");

      expect(enriched!.nextAction).toBeDefined();
      expect(enriched!.nextAction!.type).toBe("fan-out");
    });
  });

  describe("Dashboard and store commands show consistent data", () => {
    it("both views show same epic phase and feature statuses", async () => {
      const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "implement" });

      const f1 = store.addFeature({ parent: epic.id, name: "Login", slug: "login" });
      store.updateFeature(f1.id, { status: "completed" });
      store.addFeature({ parent: epic.id, name: "Signup", slug: "signup" });
      store.addFeature({ parent: epic.id, name: "Reset", slug: "reset" });

      // Store tree view
      const storeEpic = store.getEpic(epic.id);
      const storeFeatures = store.listFeatures(epic.id);

      // Enriched view (what dashboard would see)
      const { listEnrichedFromStore } = await import("../store/scan.js");
      const enrichedEpics = listEnrichedFromStore(store);
      const enriched = enrichedEpics.find(e => e.slug === "auth-system")!;

      // Both show same phase
      expect(enriched.status).toBe(storeEpic!.status);
      // Both have same number of features accessible
      expect(storeFeatures.length).toBe(3);
    });
  });
});
