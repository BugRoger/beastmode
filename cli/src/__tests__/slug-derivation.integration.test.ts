/**
 * Integration tests for collision-proof slug derivation.
 * Covers epic slug (hex suffix), feature slug (ordinal suffix),
 * and artifact filename boundary detection.
 *
 * @collision-proof-slugs @store
 */
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";
import { filenameMatchesEpic } from "../artifacts/reader.js";

describe("Collision-proof slug derivation", () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  describe("Epic slug includes the short ID suffix", () => {
    it("should match the pattern {name}-{4-hex-chars}", () => {
      const epic = store.addEpic({ name: "dashboard redesign" });
      expect(epic.slug).toMatch(/^dashboard-redesign-[0-9a-f]{4}$/);
    });

    it("should end with the first 4 characters of the entity's hex ID", () => {
      const epic = store.addEpic({ name: "dashboard redesign" });
      // Entity ID is bm-XXXX, short ID is XXXX
      const shortId = epic.id.replace("bm-", "");
      expect(epic.slug).toBe(`dashboard-redesign-${shortId}`);
    });
  });

  describe("Two epics with identical names receive distinct slugs", () => {
    it("should produce different slugs for same-name epics", () => {
      const epic1 = store.addEpic({ name: "auth system" });
      const epic2 = store.addEpic({ name: "auth system" });
      expect(epic1.slug).not.toBe(epic2.slug);
      expect(epic1.slug).toMatch(/^auth-system-/);
      expect(epic2.slug).toMatch(/^auth-system-/);
    });

    it("each slug should end with a distinct hex suffix", () => {
      const epic1 = store.addEpic({ name: "auth system" });
      const epic2 = store.addEpic({ name: "auth system" });
      const suffix1 = epic1.slug.replace("auth-system-", "");
      const suffix2 = epic2.slug.replace("auth-system-", "");
      expect(suffix1).toMatch(/^[0-9a-f]{4}$/);
      expect(suffix2).toMatch(/^[0-9a-f]{4}$/);
      expect(suffix1).not.toBe(suffix2);
    });
  });

  describe("Feature slug includes the ordinal suffix", () => {
    it("should derive feature slugs with ordinal from feature ID", () => {
      const epic = store.addEpic({ name: "auth system" });
      const f1 = store.addFeature({ parent: epic.id, name: "login flow" });
      const f2 = store.addFeature({ parent: epic.id, name: "token cache" });
      expect(f1.slug).toBe("login-flow-1");
      expect(f2.slug).toBe("token-cache-2");
    });
  });

  describe("Feature ordinal suffixes are unique within an epic", () => {
    it("should produce distinct ordinals for three features", () => {
      const epic = store.addEpic({ name: "auth system" });
      const f1 = store.addFeature({ parent: epic.id, name: "feature a" });
      const f2 = store.addFeature({ parent: epic.id, name: "feature b" });
      const f3 = store.addFeature({ parent: epic.id, name: "feature c" });

      const ordinals = [f1, f2, f3].map((f) => {
        const parts = f.slug.split("-");
        return parts[parts.length - 1];
      });
      const uniqueOrdinals = new Set(ordinals);
      expect(uniqueOrdinals.size).toBe(3);
    });
  });

  describe("Slug derivation normalizes names to kebab-case", () => {
    it.each([
      { rawName: "Dashboard Redesign", normalizedPrefix: "dashboard-redesign-" },
      { rawName: "AUTH FLOW", normalizedPrefix: "auth-flow-" },
      { rawName: "my--weird---name", normalizedPrefix: "my-weird-name-" },
    ])("normalizes '$rawName' to start with '$normalizedPrefix'", ({ rawName, normalizedPrefix }) => {
      const epic = store.addEpic({ name: rawName });
      expect(epic.slug.startsWith(normalizedPrefix)).toBe(true);
    });
  });

  describe("Artifact filename boundary detection", () => {
    it("epic-level artifact matches its own slug", () => {
      const epicSlug = "dashboard-redesign-f3a7";
      expect(
        filenameMatchesEpic("2026-04-11-dashboard-redesign-f3a7.output.json", epicSlug)
      ).toBe(true);
    });

    it("feature-level artifact is distinguished from epic-level", () => {
      const epicSlug = "dashboard-redesign-f3a7";
      const filename = "2026-04-11-dashboard-redesign-f3a7-auth-flow-1.output.json";
      // Should match epic (it's a feature under this epic)
      expect(filenameMatchesEpic(filename, epicSlug)).toBe(true);
    });

    it("design-phase hex-only slug still matches after rename", () => {
      const epicSlug = "dashboard-redesign-f3a7";
      const hexSlug = "f3a7";
      expect(
        filenameMatchesEpic("2026-04-01-f3a7.output.json", epicSlug, hexSlug)
      ).toBe(true);
    });
  });
});
