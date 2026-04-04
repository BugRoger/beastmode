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
      const epic = store.addEpic({ name: "CLI Restructure", slug: "cli-restructure" });
      const result = resolveIdentifier(store, "cli-restructure");
      expect(result).toEqual({ kind: "found", entity: epic });
    });

    it("should resolve auto-generated slug", () => {
      const epic = store.addEpic({ name: "My Cool Epic" });
      const result = resolveIdentifier(store, "my-cool-epic");
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
    it("should detect ambiguity when identifier matches ID and slug of different entities", () => {
      // Create epic A — it gets some random bm-xxxx ID
      const epicA = store.addEpic({ name: "Epic A" });
      // Create epic B with slug set to epicA's ID
      const epicB = store.addEpic({ name: "Epic B", slug: epicA.id });

      // Looking up epicA.id should find epicA by ID and epicB by slug
      const result = resolveIdentifier(store, epicA.id);
      expect(result.kind).toBe("ambiguous");
      if (result.kind === "ambiguous") {
        expect(result.matches).toHaveLength(2);
        const ids = result.matches.map(e => e.id).sort();
        expect(ids).toContain(epicA.id);
        expect(ids).toContain(epicB.id);
      }
    });
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
});
