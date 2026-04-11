import { describe, test, expect } from "vitest";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import { countTreeLines, trimTreeToTail, trimTreeFromHead } from "../dashboard/LogPanel.js";
import { buildTreePrefix, formatTreeLine } from "../dashboard/tree-format.js";
import type { TreeState } from "../dashboard/tree-types.js";

describe("@dashboard-log-fixes: System-level entries as SYSTEM node", () => {
  const systemEntries = [
    { timestamp: 1000, level: "info" as const, message: "watch loop started", seq: 0 },
    { timestamp: 2000, level: "info" as const, message: "scan complete: 3 epics", seq: 1 },
    { timestamp: 3000, level: "info" as const, message: "watch loop stopped", seq: 2 },
  ];

  test("watch loop event renders under a SYSTEM tree node with hierarchical formatting", () => {
    const state = buildTreeState([], () => [], undefined, systemEntries, []);
    expect(state.cli.entries).toHaveLength(3);
    // SYSTEM node uses hierarchical tree formatting — system entries get system prefix
    const prefix = buildTreePrefix("system");
    expect(prefix).toBe("│ ");
  });

  test("scan result renders under SYSTEM node indented as child", () => {
    const state = buildTreeState([], () => [], undefined, systemEntries, []);
    expect(state.cli.entries[1].message).toBe("scan complete: 3 epics");
    // System entries use system depth (│) — same as leaf-epic entries
    const formatted = formatTreeLine("system", "info", undefined, "scan complete", 1000);
    expect(formatted).toContain("│");
  });

  test("multiple system entries nest under single SYSTEM node without duplication", () => {
    const state = buildTreeState([], () => [], undefined, systemEntries, []);
    // All go to cli.entries — single node
    expect(state.cli.entries).toHaveLength(3);
    expect(state.cli.entries[0].message).toBe("watch loop started");
    expect(state.cli.entries[1].message).toBe("scan complete: 3 epics");
    expect(state.cli.entries[2].message).toBe("watch loop stopped");
  });

  test("SYSTEM node uses consistent tree rendering with epic nodes", () => {
    const state = buildTreeState(
      [],
      () => [],
      undefined,
      [{ timestamp: 1000, level: "info" as const, message: "system event", seq: 0 }],
      [{ id: "e1", type: "epic" as const, name: "e1", slug: "e1", status: "implement" as const, depends_on: [], created_at: "2026-01-01", updated_at: "2026-01-01", nextAction: null, features: [] }],
    );
    // Both epic and SYSTEM nodes exist in tree
    expect(state.cli.entries.length).toBeGreaterThan(0);
    expect(state.epics.length).toBeGreaterThan(0);
    // SYSTEM entries use same leaf prefix pattern as epic entries
    const systemPrefix = buildTreePrefix("system");
    const epicLeafPrefix = buildTreePrefix("leaf-epic");
    expect(systemPrefix).toBe(epicLeafPrefix);
  });

  test("countTreeLines counts SYSTEM node identically to epic nodes", () => {
    const state: TreeState = {
      cli: { entries: [
        { timestamp: 1000, level: "info", message: "a", seq: 0 },
        { timestamp: 2000, level: "info", message: "b", seq: 1 },
      ] },
      epics: [{
        slug: "e",
        status: "implement",
        features: [],
        entries: [],
      }],
    };
    // 1 SYSTEM label + 2 entries + 1 epic label = 4
    expect(countTreeLines(state)).toBe(4);
  });

  test("trimTreeToTail handles SYSTEM node like epic node", () => {
    const state: TreeState = {
      cli: { entries: [
        { timestamp: 1000, level: "info", message: "old", seq: 0 },
        { timestamp: 2000, level: "info", message: "new", seq: 1 },
      ] },
      epics: [],
    };
    // Total: 1 label + 2 entries = 3. Trim to 2 drops 1 entry.
    const trimmed = trimTreeToTail(state, 2);
    expect(trimmed.cli.entries).toHaveLength(1);
    expect(trimmed.cli.entries[0].message).toBe("new");
  });

  test("trimTreeFromHead handles SYSTEM node like epic node", () => {
    const state: TreeState = {
      cli: { entries: [
        { timestamp: 1000, level: "info", message: "first", seq: 0 },
        { timestamp: 2000, level: "info", message: "second", seq: 1 },
      ] },
      epics: [],
    };
    // Drop 2 lines: 1 label + 1 entry
    const trimmed = trimTreeFromHead(state, 2);
    expect(trimmed.cli.entries).toHaveLength(1);
    expect(trimmed.cli.entries[0].message).toBe("second");
  });
});

describe("@dashboard-log-fixes: Active sessions show current phase", () => {
  test("active session displays current phase as status badge, not unknown", () => {
    const sessions = [{ epicSlug: "my-epic", phase: "implement" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "working", seq: 0 }];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, []);
    const epic = state.epics.find(e => e.slug === "my-epic")!;
    expect(epic).toBeDefined();
    expect(epic.status).toBe("implement");
    expect(epic.status).not.toBe("unknown");
  });

  test("multiple active sessions each show their own phase", () => {
    const sessions = [
      { epicSlug: "epic-a", phase: "design" },
      { epicSlug: "epic-b", phase: "validate" },
    ];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, []);
    const a = state.epics.find(e => e.slug === "epic-a")!;
    const b = state.epics.find(e => e.slug === "epic-b")!;
    expect(a.status).toBe("design");
    expect(b.status).toBe("validate");
  });

  test("dynamic feature nodes show in-progress status, not unknown", () => {
    const sessions = [{ epicSlug: "my-epic", phase: "implement", featureSlug: "new-feat" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, []);
    const epic = state.epics.find(e => e.slug === "my-epic")!;
    const feat = epic.features.find(f => f.slug === "new-feat")!;
    expect(feat.status).toBe("in-progress");
    expect(feat.status).not.toBe("unknown");
  });

  test("synced session uses canonical phase from store", () => {
    const epics = [{
      id: "my-epic", type: "epic" as const, name: "my-epic", slug: "my-epic",
      status: "validate" as const, depends_on: [], created_at: "2026-01-01",
      updated_at: "2026-01-01", nextAction: null,
      features: [{
        id: "my-feat", type: "feature" as const, parent: "my-epic", name: "my-feat",
        slug: "my-feat", status: "in-progress" as const, depends_on: [],
        created_at: "2026-01-01", updated_at: "2026-01-01",
      }],
    }];
    const sessions = [{ epicSlug: "my-epic", phase: "implement", featureSlug: "my-feat" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, epics);
    // Epic uses store status (validate), not session phase
    const epic = state.epics.find(e => e.slug === "my-epic")!;
    expect(epic.status).toBe("validate");
    // Feature uses store status (in-progress), not dynamic default
    const feat = epic.features.find(f => f.slug === "my-feat")!;
    expect(feat.status).toBe("in-progress");
  });
});
