/**
 * Integration test: Design reconciliation updates slug in-place — entity ID remains stable.
 *
 * Tests that reconcileDesign() patches the slug on the existing entity
 * rather than deleting and recreating, preserving bm-XXXX entity ID.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";

describe("Design reconciliation updates slug in-place", () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  describe("Reconcile design updates slug without changing entity ID", () => {
    it("should update slug in-place and preserve entity ID", () => {
      // Seed an epic with hex-only slug
      const seeded = store.addEpic({ name: "a1b2" });
      const originalId = seeded.id;

      // Simulate: updateEpic with new slug
      const updated = store.updateEpic(seeded.id, { slug: "oauth-redesign-a1b2" });

      // Entity ID must be identical
      expect(updated.id).toBe(originalId);
      // Slug must be updated
      expect(updated.slug).toBe("oauth-redesign-a1b2");
      // Must be retrievable by original ID
      const retrieved = store.getEpic(originalId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.slug).toBe("oauth-redesign-a1b2");
      expect(retrieved!.id).toBe(originalId);
    });
  });

  describe("Reconcile design preserves summary metadata", () => {
    it("should retain summary fields through slug rename", () => {
      const seeded = store.addEpic({ name: "a1b2" });
      const originalId = seeded.id;

      // Update with slug + summary in one call
      const updated = store.updateEpic(seeded.id, {
        slug: "oauth-redesign-a1b2",
        summary: "Auth is broken — Redesign OAuth flow",
        design: "2026-04-11-oauth-redesign.md",
        status: "plan",
      });

      expect(updated.id).toBe(originalId);
      expect(updated.slug).toBe("oauth-redesign-a1b2");
      expect(updated.summary).toBe("Auth is broken — Redesign OAuth flow");
      expect(updated.design).toBe("2026-04-11-oauth-redesign.md");
      expect(updated.status).toBe("plan");
    });
  });

  describe("No orphaned entities after reconciliation", () => {
    it("should not leave old entities in the store", () => {
      const seeded = store.addEpic({ name: "a1b2" });

      store.updateEpic(seeded.id, { slug: "oauth-redesign-a1b2" });

      // Only one epic should exist
      const allEpics = store.listEpics();
      expect(allEpics).toHaveLength(1);
      expect(allEpics[0].slug).toBe("oauth-redesign-a1b2");

      // Old slug should not be found in the list
      const oldSlugMatch = store.listEpics().find((e) => e.slug === seeded.slug);
      expect(oldSlugMatch).toBeUndefined();

      // New slug should be found
      const newSlugMatch = store.listEpics().find((e) => e.slug === "oauth-redesign-a1b2");
      expect(newSlugMatch).toBeDefined();
      expect(newSlugMatch!.id).toBe(seeded.id);
    });
  });
});
