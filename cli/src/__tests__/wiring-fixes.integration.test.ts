import { describe, test, expect } from "vitest";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import { FallbackEntryStore, lifecycleToLogEntry } from "../dashboard/lifecycle-entries.js";
import { filterTreeByVerbosity } from "../dashboard/LogPanel.js";
import type { EnrichedEpic, Feature } from "../store/types.js";
import type { SystemEntry } from "../dashboard/tree-types.js";

function mockFeature(slug: string, status: Feature["status"], parent: string): Feature {
  return {
    id: slug, type: "feature", parent, name: slug, slug, status,
    depends_on: [], created_at: "2026-01-01", updated_at: "2026-01-01",
  };
}

function mockEpic(slug: string, status: string, features: Feature[] = []): EnrichedEpic {
  return {
    id: slug, type: "epic" as const, name: slug, slug,
    status: status as EnrichedEpic["status"],
    depends_on: [], created_at: "2026-01-01", updated_at: "2026-01-01",
    nextAction: null, features,
  };
}

describe("Wiring Fixes Integration", () => {
  // US1: Log entries appear in tree panel (enrichedEpics seeding)
  test("log entries render under epic nodes when enrichedEpics seeds the skeleton", () => {
    const epics = [
      mockEpic("auth", "implement", [mockFeature("login", "in-progress", "auth")]),
    ];
    const store = new FallbackEntryStore();
    store.push("auth", "implement", undefined, {
      type: "text", timestamp: 1000, text: "working", level: "info",
    });

    const sessions = [{ epicSlug: "auth", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      [],
      epics,
    );

    const epic = state.epics.find((e) => e.slug === "auth");
    expect(epic).toBeDefined();
    expect(epic!.entries.length).toBeGreaterThan(0);
    expect(epic!.features).toHaveLength(1);
    expect(epic!.features[0].slug).toBe("login");
  });

  // US2: Auto-follow — tree has entries, so trimTreeToTail can work
  test("tree skeleton enables auto-follow by providing nodes for entries", () => {
    const epics = [mockEpic("auth", "implement")];
    const store = new FallbackEntryStore();
    for (let i = 0; i < 10; i++) {
      store.push("auth", "implement", undefined, {
        type: "text", timestamp: 1000 + i, text: `msg-${i}`, level: "info",
      });
    }

    const sessions = [{ epicSlug: "auth", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      [],
      epics,
    );

    expect(state.epics[0].entries.length).toBe(10);
  });

  // US3: Verbosity filtering — debug entries hidden at default verbosity
  test("debug entries are hidden at default verbosity (0), visible at verbosity 1", () => {
    const epics = [mockEpic("auth", "implement")];
    const store = new FallbackEntryStore();
    store.push("auth", "implement", undefined, {
      type: "text", timestamp: 1000, text: "info msg", level: "info",
    });
    store.push("auth", "implement", undefined, {
      type: "text", timestamp: 2000, text: "debug msg", level: "debug",
    });

    const sessions = [{ epicSlug: "auth", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      [],
      epics,
    );

    // At verbosity 0 (info) — debug entry should be hidden
    const filtered0 = filterTreeByVerbosity(state, 0);
    const entries0 = filtered0.epics[0].entries;
    expect(entries0).toHaveLength(1);
    expect(entries0[0].message).toBe("info msg");

    // At verbosity 1 (debug) — all entries visible
    const filtered1 = filterTreeByVerbosity(state, 1);
    const entries1 = filtered1.epics[0].entries;
    expect(entries1).toHaveLength(2);
  });

  // US5+6: Session-started produces info + debug entries
  test("session-started returns array with info dispatching + debug session ID", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "auth",
      phase: "implement",
      sessionId: "w:12345",
    });

    expect(Array.isArray(entries)).toBe(true);
    const arr = entries as Array<{ level: string; text: string }>;
    expect(arr).toHaveLength(2);

    // First: info-level dispatch message
    expect(arr[0].level).toBe("info");
    expect(arr[0].text).toContain("dispatching");
    expect(arr[0].text).not.toContain("session:");

    // Second: debug-level session ID
    expect(arr[1].level).toBe("debug");
    expect(arr[1].text).toContain("session:");
    expect(arr[1].text).toContain("w:12345");
  });

  // Verbosity filtering respects explicit level field on entries
  test("toTreeEntry preserves explicit level from LogEntry", () => {
    const epics = [mockEpic("auth", "implement")];
    const store = new FallbackEntryStore();
    // Push entry with type "text" but explicit level "debug"
    store.push("auth", "implement", undefined, {
      type: "text", timestamp: 1000, text: "debug detail", level: "debug",
    });

    const sessions = [{ epicSlug: "auth", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      [],
      epics,
    );

    // The tree entry should have level "debug", not "info"
    expect(state.epics[0].entries[0].level).toBe("debug");
  });
});
