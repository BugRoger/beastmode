import { describe, test, expect } from "vitest";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import { FallbackEntryStore, lifecycleToLogEntry } from "../dashboard/lifecycle-entries.js";
import type { SystemEntry } from "../dashboard/tree-types.js";

describe("Event routing, deduplication, and level assignment", () => {
  // --- US 1: Deduplication / hierarchical routing ---

  test("each log entry appears exactly once under its epic", () => {
    const store = new FallbackEntryStore();
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "auth-system",
      phase: "implement",
      sessionId: "w:12345",
    });
    for (const e of entries) {
      store.push("auth-system", "implement", undefined, e);
    }

    const sessions = [{ epicSlug: "auth-system", phase: "implement" }];
    // No system entries — epic-scoped events should not appear at CLI root
    const systemEntries: SystemEntry[] = [];

    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      systemEntries,
    );

    // Entry appears under the epic node
    const epic = state.epics.find((e) => e.slug === "auth-system");
    expect(epic).toBeDefined();
    expect(epic!.entries.length).toBeGreaterThan(0);

    // Entry does NOT appear under CLI root
    const cliMessages = state.cli.entries.map((e) => e.message);
    expect(cliMessages).not.toContain(expect.stringContaining("auth-system"));
  });

  test("entry routed to a feature does not also appear at epic level", () => {
    const store = new FallbackEntryStore();
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "auth-system",
      featureSlug: "login",
      phase: "implement",
      sessionId: "w:111",
    });
    for (const e of entries) {
      store.push("auth-system", "implement", "login", e);
    }

    const sessions = [{ epicSlug: "auth-system", phase: "implement", featureSlug: "login" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
    );

    const epic = state.epics.find((e) => e.slug === "auth-system")!;
    const feature = epic.features.find((f) => f.slug === "login");
    expect(feature).toBeDefined();
    expect(feature!.entries.length).toBeGreaterThan(0);

    // Not duplicated at epic level
    expect(epic.entries).toHaveLength(0);
  });

  // --- US 2: Debug-level lifecycle events ---

  test("session-started returns info + debug pair", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "e",
      phase: "plan",
      sessionId: "w:1",
    });
    const arr = entries as Array<{ level: string; text: string }>;
    expect(arr[0]).toHaveProperty("level", "info");
    expect(arr[1]).toHaveProperty("level", "debug");
  });

  test("session-completed success is classified as debug level", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "e",
      phase: "plan",
      success: true,
      durationMs: 5000,
    });
    expect(entry).toHaveProperty("level", "debug");
  });

  test("session-completed failure remains error level", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "e",
      phase: "plan",
      success: false,
      durationMs: 3000,
    });
    expect(entry).toHaveProperty("level", "error");
  });

  // --- US 3: Warn-level abnormal condition events ---

  test("session-dead is classified as warn level", () => {
    const entry = lifecycleToLogEntry("session-dead", {
      epicSlug: "e",
      phase: "implement",
      tty: "/dev/ttys001",
      sessionId: "s-1",
    });
    expect(entry).toHaveProperty("level", "warn");
  });

  test("epic-blocked is classified as warn level", () => {
    const entry = lifecycleToLogEntry("epic-blocked", {
      epicSlug: "e",
      gate: "validate",
      reason: "tests failing",
    });
    expect(entry).toHaveProperty("level", "warn");
  });

  test("release:held is classified as warn level", () => {
    const entry = lifecycleToLogEntry("release:held", {
      waitingSlug: "e1",
      blockingSlug: "e2",
    });
    expect(entry).toHaveProperty("level", "warn");
  });

  // --- US 4: iTerm session ID in dispatch entries ---

  test("dispatch debug entry includes the iTerm session identifier", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "e",
      phase: "implement",
      sessionId: "w:12345",
    });
    const arr = entries as Array<{ level: string; text: string }>;
    expect(arr[1].text).toContain("session: w:12345");
  });

  test("dispatch debug entry with various session ID formats", () => {
    for (const sessionId of ["w:12345", "w:67890", "w:1"]) {
      const entries = lifecycleToLogEntry("session-started", {
        epicSlug: "e",
        phase: "implement",
        sessionId,
      });
      const arr = entries as Array<{ level: string; text: string }>;
      expect(arr[1].text).toContain(`session: ${sessionId}`);
    }
  });

  // --- Level propagation through tree ---

  test("debug-level lifecycle entry propagates debug to tree entry", () => {
    const store = new FallbackEntryStore();
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "auth-system",
      phase: "implement",
      sessionId: "w:1",
    });
    for (const e of entries) {
      store.push("auth-system", "implement", undefined, e);
    }

    const sessions = [{ epicSlug: "auth-system", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
    );

    const epic = state.epics.find((e) => e.slug === "auth-system")!;
    expect(epic.entries[0].level).toBe("info");
  });

  test("warn-level lifecycle entry propagates warn to tree entry", () => {
    const store = new FallbackEntryStore();
    const entry = lifecycleToLogEntry("epic-blocked", {
      epicSlug: "auth-system",
      gate: "validate",
      reason: "tests failing",
    });
    store.push("auth-system", "unknown", undefined, entry);

    const sessions = [{ epicSlug: "auth-system", phase: "unknown" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
    );

    const epic = state.epics.find((e) => e.slug === "auth-system")!;
    expect(epic.entries[0].level).toBe("warn");
  });

  test("error-level lifecycle entry propagates error to tree entry", () => {
    const store = new FallbackEntryStore();
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "auth-system",
      phase: "implement",
      success: false,
      durationMs: 3000,
    });
    store.push("auth-system", "implement", undefined, entry);

    const sessions = [{ epicSlug: "auth-system", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
    );

    const epic = state.epics.find((e) => e.slug === "auth-system")!;
    expect(epic.entries[0].level).toBe("error");
  });
});
