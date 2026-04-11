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
  let dashboardSlug: string;
  let dashboardId: string;
  let authSlug: string;

  beforeEach(() => {
    store = new InMemoryTaskStore();
    // Background: two epics — slugs are derived (name + short hex)
    const dashboard = store.addEpic({ name: "Dashboard Redesign" });
    const auth = store.addEpic({ name: "Auth System" });
    dashboardSlug = dashboard.slug;
    dashboardId = dashboard.id;
    authSlug = auth.slug;
  });

  it("Exact slug match takes priority over prefix match", () => {
    const result = resolveIdentifier(store, dashboardSlug);
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.slug).toBe(dashboardSlug);
    }
  });

  it("Prefix match resolves to full slug", () => {
    const result = resolveIdentifier(store, "dashboard-redesign", {
      allowPrefix: true,
    });
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.slug).toBe(dashboardSlug);
    }
  });

  it("Prefix match works with partial name", () => {
    const result = resolveIdentifier(store, "dashboard", {
      allowPrefix: true,
    });
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.slug).toBe(dashboardSlug);
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
      expect(slugs).toContain(dashboardSlug);
      expect(slugs).toContain(metrics.slug);
    }
  });

  it("Exact entity ID match takes priority over prefix", () => {
    const result = resolveIdentifier(store, dashboardId, {
      allowPrefix: true,
    });
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.id).toBe(dashboardId);
    }
  });

  it("Internal callers use exact match only (no prefix expansion)", () => {
    // Without allowPrefix, "dashboard-redesign" should NOT match "dashboard-redesign-XXXX"
    const result = resolveIdentifier(store, "dashboard-redesign");
    expect(result.kind).toBe("not-found");
  });
});
