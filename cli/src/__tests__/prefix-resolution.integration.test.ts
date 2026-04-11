/**
 * BDD integration test for CLI prefix resolution.
 *
 * @collision-proof-slugs @cli
 * Feature: CLI prefix resolution -- human-readable prefix resolves to full slug
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";
import { resolveIdentifier } from "../store/resolve.js";

describe("CLI prefix resolution", () => {
  let store: InMemoryTaskStore;
  let dashboardEpic: { id: string; slug: string };
  let authEpic: { id: string; slug: string };

  beforeEach(() => {
    store = new InMemoryTaskStore();
    // Background: two epics with collision-proof slugs (auto-derived: name-shortId)
    const d = store.addEpic({ name: "Dashboard Redesign" });
    dashboardEpic = { id: d.id, slug: d.slug };
    const a = store.addEpic({ name: "Auth System" });
    authEpic = { id: a.id, slug: a.slug };
  });

  it("Exact slug match takes priority over prefix match", () => {
    const result = resolveIdentifier(store, dashboardEpic.slug);
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.slug).toBe(dashboardEpic.slug);
    }
  });

  it("Prefix match resolves to full slug", () => {
    const result = resolveIdentifier(store, "dashboard-redesign", {
      allowPrefix: true,
    });
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.slug).toBe(dashboardEpic.slug);
    }
  });

  it("Prefix match works with partial name", () => {
    const result = resolveIdentifier(store, "dashboard", {
      allowPrefix: true,
    });
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.slug).toBe(dashboardEpic.slug);
    }
  });

  it("Ambiguous prefix match returns an error", () => {
    // Add a second dashboard-prefixed epic
    const metrics = store.addEpic({ name: "Dashboard Metrics" });

    const result = resolveIdentifier(store, "dashboard", {
      allowPrefix: true,
    });
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      const slugs = result.matches.map((e) => e.slug).sort();
      expect(slugs).toContain(dashboardEpic.slug);
      expect(slugs).toContain(metrics.slug);
    }
  });

  it("Exact entity ID match takes priority over prefix", () => {
    const result = resolveIdentifier(store, dashboardEpic.id, {
      allowPrefix: true,
    });
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.id).toBe(dashboardEpic.id);
    }
  });

  it("Internal callers use exact match only (no prefix expansion)", () => {
    // Without allowPrefix, "dashboard-redesign" should NOT match the auto-derived slug
    const result = resolveIdentifier(store, "dashboard-redesign");
    expect(result.kind).toBe("not-found");
  });
});
