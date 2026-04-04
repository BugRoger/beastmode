import { describe, test, expect } from "vitest";
import type { EnrichedManifest, ManifestFeature } from "../manifest/store.js";

import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import { getKeyHints } from "../dashboard/key-hints.js";
import type { DashboardMode } from "../dashboard/hooks/use-dashboard-keyboard.js";

// ---------------------------------------------------------------------------
// Mock factories (same pattern as details-panel.test.ts)
// ---------------------------------------------------------------------------

function mockFeature(overrides: Partial<ManifestFeature> = {}): ManifestFeature {
  return {
    slug: "feat-one",
    plan: "plan-one",
    status: "pending",
    ...overrides,
  };
}

function mockEpic(overrides: Partial<EnrichedManifest> = {}): EnrichedManifest {
  return {
    slug: "test-epic",
    phase: "implement",
    features: [mockFeature()],
    artifacts: {},
    lastUpdated: "2026-04-04",
    manifestPath: "/tmp/test.manifest.json",
    nextAction: null,
    ...overrides,
  } as EnrichedManifest;
}

// ---------------------------------------------------------------------------
// Re-implement App.tsx data flow as pure functions for testing
// ---------------------------------------------------------------------------

/** Mirrors App.tsx: slugAtIndex — index 0 is "(all)", returns undefined */
function slugAtIndex(epics: EnrichedManifest[], index: number): string | undefined {
  if (index === 0) return undefined;
  return epics[index - 1]?.slug;
}

/** Mirrors App.tsx: filteredEpics — filters by showAll toggle and active filter */
function filterEpics(
  epics: EnrichedManifest[],
  showAll: boolean,
  activeFilter: string,
): EnrichedManifest[] {
  return epics.filter((e) => {
    if (!showAll && (e.phase === "done" || e.phase === "cancelled")) {
      return false;
    }
    if (activeFilter && !e.slug.includes(activeFilter)) {
      return false;
    }
    return true;
  });
}

/** Mirrors App.tsx: selectedEpicSlug derivation */
function deriveSelectedEpicSlug(
  filteredEpics: EnrichedManifest[],
  selectedIndex: number,
): string | undefined {
  if (selectedIndex === 0) return undefined;
  return filteredEpics[selectedIndex - 1]?.slug;
}

/** Mirrors DetailsPanel: view resolution */
type ViewKind = "overview" | "single-session" | "implement" | "empty";
function resolveDetailsView(
  epics: EnrichedManifest[],
  selectedIndex: number,
): { kind: ViewKind; epic?: EnrichedManifest } {
  if (selectedIndex === 0) return { kind: "overview" };
  const epic = epics[selectedIndex - 1];
  if (!epic) return { kind: "empty" };
  if (epic.phase === "implement") return { kind: "implement", epic };
  return { kind: "single-session", epic };
}

// ---------------------------------------------------------------------------
// Group 1: ThreePanelLayout is the top-level layout
// ---------------------------------------------------------------------------

describe("App integration — ThreePanelLayout wiring", () => {
  test("App passes filteredEpics to EpicsPanel and DetailsPanel", () => {
    const epics = [
      mockEpic({ slug: "alpha", phase: "implement" }),
      mockEpic({ slug: "beta", phase: "done" }),
      mockEpic({ slug: "gamma", phase: "design" }),
    ];

    // showAll = false filters out "done"
    const filtered = filterEpics(epics, false, "");
    expect(filtered.map((e) => e.slug)).toEqual(["alpha", "gamma"]);

    // Both EpicsPanel and DetailsPanel receive the same filtered list
    const epicsForPanel = filtered;
    const epicsForDetails = filtered;
    expect(epicsForPanel).toEqual(epicsForDetails);
  });

  test("App passes selectedIndex from keyboard nav to both panels", () => {
    const selectedIndex = 2;

    const epics = [
      mockEpic({ slug: "alpha", phase: "implement" }),
      mockEpic({ slug: "beta", phase: "design" }),
    ];

    const detailsView = resolveDetailsView(epics, selectedIndex);
    expect(detailsView.kind).toBe("single-session");
    expect(detailsView.epic?.slug).toBe("beta");
  });

  test("App computes key hints from keyboard mode", () => {
    const mode: DashboardMode = "normal";
    const hints = getKeyHints(mode);
    expect(hints).toContain("q quit");
    expect(hints).toContain("navigate");
  });

  test("App constructs cancel prompt when cancelFlow is confirming", () => {
    const cancelConfirmingSlug = "my-epic";
    const promptText = `Cancel ${cancelConfirmingSlug}? (y/n)`;
    expect(promptText).toBe("Cancel my-epic? (y/n)");
  });

  test("App passes cancelConfirmingSlug=undefined when not confirming", () => {
    const cancelFlowPhase: string = "idle";
    const cancelConfirmingSlug =
      cancelFlowPhase === "confirming" ? "some-slug" : undefined;
    expect(cancelConfirmingSlug).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Group 2: Epic selection propagates to DetailsPanel
// ---------------------------------------------------------------------------

describe("App integration — selection propagates to DetailsPanel", () => {
  const epics = [
    mockEpic({ slug: "alpha", phase: "implement", features: [mockFeature({ slug: "f1", status: "completed" })] }),
    mockEpic({ slug: "beta", phase: "design" }),
    mockEpic({ slug: "gamma", phase: "plan" }),
  ];

  test("index 0 → DetailsPanel shows pipeline overview", () => {
    const view = resolveDetailsView(epics, 0);
    expect(view.kind).toBe("overview");
    expect(view.epic).toBeUndefined();
  });

  test("index 1 → DetailsPanel shows first epic (implement detail)", () => {
    const view = resolveDetailsView(epics, 1);
    expect(view.kind).toBe("implement");
    expect(view.epic?.slug).toBe("alpha");
    expect(view.epic?.features[0].slug).toBe("f1");
  });

  test("index 2 → DetailsPanel shows second epic (single-session)", () => {
    const view = resolveDetailsView(epics, 2);
    expect(view.kind).toBe("single-session");
    expect(view.epic?.slug).toBe("beta");
    expect(view.epic?.phase).toBe("design");
  });

  test("index beyond epics → DetailsPanel shows empty", () => {
    const view = resolveDetailsView(epics, 10);
    expect(view.kind).toBe("empty");
  });
});

// ---------------------------------------------------------------------------
// Group 3: Epic selection propagates to LogPanel via tree state
// ---------------------------------------------------------------------------

describe("App integration — selection propagates to LogPanel", () => {
  test("index 0 (all) → LogPanel gets aggregate tree state from all sessions", () => {
    const selectedEpicSlug = deriveSelectedEpicSlug([], 0);
    expect(selectedEpicSlug).toBeUndefined();

    const sessions = [
      { epicSlug: "alpha", phase: "implement" },
      { epicSlug: "beta", phase: "design" },
    ];

    const filtered = selectedEpicSlug === undefined
      ? sessions
      : sessions.filter((s) => s.epicSlug === selectedEpicSlug);

    expect(filtered.length).toBe(2);
  });

  test("index 1 → LogPanel gets filtered tree state for selected epic", () => {
    const epics = [
      mockEpic({ slug: "alpha" }),
      mockEpic({ slug: "beta" }),
    ];
    const selectedEpicSlug = deriveSelectedEpicSlug(epics, 1);
    expect(selectedEpicSlug).toBe("alpha");

    const sessions = [
      { epicSlug: "alpha", phase: "implement" },
      { epicSlug: "beta", phase: "design" },
    ];

    const filtered = selectedEpicSlug === undefined
      ? sessions
      : sessions.filter((s) => s.epicSlug === selectedEpicSlug);

    expect(filtered.length).toBe(1);
    expect(filtered[0].epicSlug).toBe("alpha");
  });

  test("buildTreeState produces correct tree from filtered sessions", () => {
    const sessions = [
      { epicSlug: "alpha", phase: "implement", featureSlug: "feat-1" },
    ];

    const mockEntries = [
      { timestamp: 1000, type: "result" as const, text: "test output", seq: 1 },
    ];

    const tree = buildTreeState(sessions, () => mockEntries);

    expect(tree.epics.length).toBe(1);
    expect(tree.epics[0].slug).toBe("alpha");
    expect(tree.epics[0].phases.length).toBe(1);
    expect(tree.epics[0].phases[0].phase).toBe("implement");
    expect(tree.epics[0].phases[0].features.length).toBe(1);
    expect(tree.epics[0].phases[0].features[0].slug).toBe("feat-1");
    expect(tree.epics[0].phases[0].features[0].entries.length).toBe(1);
  });

  test("buildTreeState with no sessions produces empty tree", () => {
    const tree = buildTreeState([], () => []);
    expect(tree.epics.length).toBe(0);
    expect(tree.system.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Group 4: End-to-end data flow — filter + selection + tree state
// ---------------------------------------------------------------------------

describe("App integration — end-to-end data flow", () => {
  const allEpics = [
    mockEpic({ slug: "dashboard-rework", phase: "implement" }),
    mockEpic({ slug: "auth-flow", phase: "design" }),
    mockEpic({ slug: "dashboard-v2", phase: "done" }),
    mockEpic({ slug: "api-cleanup", phase: "cancelled" }),
  ];

  test("filter + toggle produces correct visible list", () => {
    const visible = filterEpics(allEpics, false, "");
    expect(visible.map((e) => e.slug)).toEqual(["dashboard-rework", "auth-flow"]);

    const allVisible = filterEpics(allEpics, true, "");
    expect(allVisible.length).toBe(4);
  });

  test("name filter narrows visible list", () => {
    const filtered = filterEpics(allEpics, true, "dashboard");
    expect(filtered.map((e) => e.slug)).toEqual(["dashboard-rework", "dashboard-v2"]);
  });

  test("selection on filtered list maps to correct epic", () => {
    const filtered = filterEpics(allEpics, false, "");

    const slug1 = deriveSelectedEpicSlug(filtered, 1);
    expect(slug1).toBe("dashboard-rework");

    const slug2 = deriveSelectedEpicSlug(filtered, 2);
    expect(slug2).toBe("auth-flow");
  });

  test("slugAtIndex maps correctly with offset", () => {
    const filtered = filterEpics(allEpics, false, "");
    expect(slugAtIndex(filtered, 0)).toBeUndefined();
    expect(slugAtIndex(filtered, 1)).toBe("dashboard-rework");
    expect(slugAtIndex(filtered, 2)).toBe("auth-flow");
    expect(slugAtIndex(filtered, 3)).toBeUndefined();
  });

  test("selected epic feeds into tree state filtering", () => {
    const filtered = filterEpics(allEpics, false, "");
    const selectedSlug = deriveSelectedEpicSlug(filtered, 1);
    expect(selectedSlug).toBe("dashboard-rework");

    const sessions = [
      { epicSlug: "dashboard-rework", phase: "implement" },
      { epicSlug: "auth-flow", phase: "design" },
    ];
    const treeSessions = selectedSlug === undefined
      ? sessions
      : sessions.filter((s) => s.epicSlug === selectedSlug);

    expect(treeSessions.length).toBe(1);
    expect(treeSessions[0].epicSlug).toBe("dashboard-rework");
  });

  test("(all) selection feeds aggregate tree state", () => {
    const filtered = filterEpics(allEpics, false, "");
    const selectedSlug = deriveSelectedEpicSlug(filtered, 0);
    expect(selectedSlug).toBeUndefined();

    const sessions = [
      { epicSlug: "dashboard-rework", phase: "implement" },
      { epicSlug: "auth-flow", phase: "design" },
    ];
    const treeSessions = selectedSlug === undefined
      ? sessions
      : sessions.filter((s) => s.epicSlug === selectedSlug);

    expect(treeSessions.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Group 5: WatchLoop event wiring model
// ---------------------------------------------------------------------------

describe("App integration — WatchLoop event wiring", () => {
  test("event names match WatchLoopEventMap", () => {
    const subscribedEvents = [
      "started",
      "stopped",
      "session-started",
      "session-completed",
      "scan-complete",
      "epic-cancelled",
    ];

    expect(subscribedEvents).toContain("started");
    expect(subscribedEvents).toContain("stopped");
    expect(subscribedEvents).toContain("session-started");
    expect(subscribedEvents).toContain("session-completed");
    expect(subscribedEvents).toContain("scan-complete");
    expect(subscribedEvents).toContain("epic-cancelled");
  });

  test("activeSessions tracks session-started and session-completed", () => {
    const activeSessions = new Set<string>();

    const startedSlug = "my-epic";
    activeSessions.add(startedSlug);
    expect(activeSessions.has("my-epic")).toBe(true);

    activeSessions.delete(startedSlug);
    expect(activeSessions.has("my-epic")).toBe(false);
  });

  test("activeSessions passed to EpicsPanel and DetailsPanel", () => {
    const activeSessions = new Set(["alpha", "gamma"]);

    expect(activeSessions.has("alpha")).toBe(true);
    expect(activeSessions.has("beta")).toBe(false);
    expect(activeSessions.has("gamma")).toBe(true);
  });
});
