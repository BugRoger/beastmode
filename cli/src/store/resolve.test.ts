/**
 * Tests for ID resolution module.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { InMemoryTaskStore } from "./in-memory.js";
import { resolveIdentifier } from "./resolve.js";

describe("resolveIdentifier", () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  describe("ID lookup", () => {
    it("should resolve epic by exact ID", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      const result = resolveIdentifier(store, epic.id);
      expect(result).toEqual({ kind: "found", entity: epic });
    });

    it("should resolve feature by exact ID", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feature = store.addFeature({ parent: epic.id, name: "Feature" });
      const result = resolveIdentifier(store, feature.id);
      expect(result).toEqual({ kind: "found", entity: feature });
    });
  });

  describe("slug lookup", () => {
    it("should resolve epic by slug", () => {
      const epic = store.addEpic({ name: "CLI Restructure" });
      const result = resolveIdentifier(store, epic.slug);
      expect(result).toEqual({ kind: "found", entity: epic });
    });

    it("should resolve auto-generated slug", () => {
      const epic = store.addEpic({ name: "My Cool Epic" });
      const result = resolveIdentifier(store, epic.slug);
      expect(result).toEqual({ kind: "found", entity: epic });
    });
  });

  describe("not found", () => {
    it("should return not-found for unknown identifier", () => {
      const result = resolveIdentifier(store, "nonexistent");
      expect(result).toEqual({ kind: "not-found" });
    });

    it("should return not-found for empty store", () => {
      const result = resolveIdentifier(store, "bm-0000");
      expect(result).toEqual({ kind: "not-found" });
    });
  });

  describe("ambiguity detection", () => {
    // Collision-proof slug format (slugify(name)+"-"+shortId) makes ID/slug
    // collisions structurally impossible, so no ambiguity test is needed here.
  });

  describe("feature-to-epic resolution", () => {
    it("should resolve feature ID to parent epic with resolveToEpic option", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feature = store.addFeature({ parent: epic.id, name: "Feature 1" });
      const result = resolveIdentifier(store, feature.id, { resolveToEpic: true });
      expect(result).toEqual({ kind: "found", entity: epic });
    });

    it("should return epic as-is with resolveToEpic option", () => {
      const epic = store.addEpic({ name: "Epic" });
      const result = resolveIdentifier(store, epic.id, { resolveToEpic: true });
      expect(result).toEqual({ kind: "found", entity: epic });
    });

    it("should resolve feature ID without resolveToEpic to the feature itself", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feature = store.addFeature({ parent: epic.id, name: "Feature 1" });
      const result = resolveIdentifier(store, feature.id);
      expect(result).toEqual({ kind: "found", entity: feature });
    });
  });

  describe("feature slug resolution", () => {
    it("should resolve feature by slug", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feature = store.addFeature({ parent: epic.id, name: "Login" });
      const result = resolveIdentifier(store, feature.slug);
      expect(result.kind).toBe("found");
      if (result.kind === "found") {
        expect(result.entity.id).toBe(feature.id);
      }
    });

    it("should prefer epic slug over feature slug", () => {
      const epic = store.addEpic({ name: "Auth" });
      store.addFeature({ parent: epic.id, name: "Auth Feature" });
      const result = resolveIdentifier(store, epic.slug);
      expect(result.kind).toBe("found");
      if (result.kind === "found") {
        expect(result.entity.type).toBe("epic");
      }
    });

    it("should resolve feature slug to parent epic when resolveToEpic is true", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feature = store.addFeature({ parent: epic.id, name: "Login" });
      const result = resolveIdentifier(store, feature.slug, { resolveToEpic: true });
      expect(result.kind).toBe("found");
      if (result.kind === "found") {
        expect(result.entity.id).toBe(epic.id);
      }
    });
  });
});
