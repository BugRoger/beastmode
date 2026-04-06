# Rendering Fixes — Implementation Tasks

## Goal

Two rendering fixes for the dashboard tree view:
1. Rename "CLI" root node to "SYSTEM" with consistent hierarchical rendering (same prefix/connector pattern as epic nodes)
2. Use session phase for dynamic node status badges instead of "unknown"

## Architecture

- **Tree hierarchy:** CLI (renamed SYSTEM) > Epic > Feature > Entry
- **Tree prefix pattern:** SYSTEM gets `│ ` prefix (same as epic), SYSTEM entries get `│ · ` prefix (same as leaf-epic)
- **Color:** SYSTEM node uses Monokai muted gray `#727072` (`CHROME.muted`)
- **Dynamic nodes:** Epic nodes created for unknown sessions use `session.phase` as status; feature nodes use `"in-progress"`
- **Palette:** `PHASE_COLOR` for phases, `CHROME.muted` for system

## Tech Stack

- TypeScript, React (Ink), Vitest, Bun
- Test runner: `bun --bun vitest run`
- Source: `cli/src/dashboard/`
- Tests: `cli/src/__tests__/`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/tree-format.ts` | Modify | Change `"system"` depth prefix from `""` to `"│ · "` and `"cli"` label rendering |
| `cli/src/dashboard/TreeView.tsx` | Modify | Render SYSTEM node with `│ ` prefix, muted gray, consistent with epic nodes |
| `cli/src/dashboard/LogPanel.tsx` | Modify | `countTreeLines` already counts CLI as 1+entries (consistent); `trimTreeFromHead` handles CLI root — both unchanged since behavior is already consistent |
| `cli/src/dashboard/hooks/use-dashboard-tree-state.ts` | Modify | Dynamic epic status = `session.phase`, dynamic feature status = `"in-progress"` |
| `cli/src/__tests__/rendering-fixes.integration.test.ts` | Create | Integration test from Gherkin scenarios |
| `cli/src/__tests__/rendering-fixes-system-node.test.ts` | Create | Unit tests for SYSTEM node rendering |
| `cli/src/__tests__/rendering-fixes-dynamic-status.test.ts` | Create | Unit tests for dynamic node status |

---

## Task 0: Integration Test (RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/rendering-fixes.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
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
    // SYSTEM node uses hierarchical tree formatting — system entries get leaf-epic prefix
    const prefix = buildTreePrefix("system");
    expect(prefix).toBe("│ · ");
  });

  test("scan result renders under SYSTEM node indented as child", () => {
    const state = buildTreeState([], () => [], undefined, systemEntries, []);
    expect(state.cli.entries[1].message).toBe("scan complete: 3 epics");
    // System entries use leaf-epic depth (│ ·) — same as epic leaf entries
    const formatted = formatTreeLine("system", "info", undefined, "scan complete", 1000);
    expect(formatted).toContain("│");
    expect(formatted).toContain("·");
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
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `bun --bun vitest run src/__tests__/rendering-fixes.integration.test.ts`
Expected: FAIL — `buildTreePrefix("system")` returns `""` not `"│ · "`, and dynamic epic status is `"unknown"` not session phase

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/rendering-fixes.integration.test.ts
git commit -m "test(rendering-fixes): add integration tests for SYSTEM node and dynamic status badges"
```

---

## Task 1: Rename CLI to SYSTEM and apply hierarchical prefix to system entries

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/tree-format.ts:36-38`
- Modify: `cli/src/dashboard/TreeView.tsx:117-126`
- Create: `cli/src/__tests__/rendering-fixes-system-node.test.ts`

- [ ] **Step 1: Write failing tests for SYSTEM node rendering**

```typescript
import { describe, test, expect } from "vitest";
import { buildTreePrefix, formatTreeLine } from "../dashboard/tree-format.js";
import { CHROME } from "../dashboard/monokai-palette.js";

describe("SYSTEM node rendering", () => {
  test("system depth uses leaf-epic prefix (│ · )", () => {
    expect(buildTreePrefix("system")).toBe("│ · ");
  });

  test("cli depth uses epic prefix (│ )", () => {
    expect(buildTreePrefix("cli")).toBe("│ ");
  });

  test("formatTreeLine for cli renders SYSTEM label with prefix", () => {
    const line = formatTreeLine("cli", "info", undefined, "SYSTEM", 0);
    expect(line).toContain("│");
    expect(line).toContain("SYSTEM");
  });

  test("formatTreeLine for system entries includes tree connectors", () => {
    const line = formatTreeLine("system", "info", undefined, "watch started", 1000);
    expect(line).toContain("│");
    expect(line).toContain("·");
    expect(line).toContain("watch started");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --bun vitest run src/__tests__/rendering-fixes-system-node.test.ts`
Expected: FAIL — `buildTreePrefix("system")` returns `""`, `buildTreePrefix("cli")` returns `""`

- [ ] **Step 3: Implement tree-format.ts changes**

In `cli/src/dashboard/tree-format.ts`, modify `buildTreePrefix`:

Change the `"cli"` case to return `"│ "` (same as epic):
```typescript
case "cli":
  return "│ ";
```

Change the `"system"` case to return `"│ · "` (same as leaf-epic):
```typescript
case "system":
  return "│ · ";
```

In `formatTreeLine`, change the `"cli"` depth handler from returning just `message` to returning `prefix + message`:
```typescript
if (depth === "cli") {
  return `${prefix}${message}`;
}
```

Remove the `"system"` special case at line 125-127 — system entries now flow through the normal leaf rendering path with their `"│ · "` prefix.

- [ ] **Step 4: Implement TreeView.tsx changes**

In `cli/src/dashboard/TreeView.tsx`, replace the CLI root node section (lines 117-126) with a SYSTEM node that renders like an epic:

```typescript
{state.cli.entries.length > 0 && (
  <>
    <Text bold>
      <Text>{chalk.hex(CHROME.muted)("│ ")}</Text>
      <Text color={CHROME.muted}>SYSTEM</Text>
    </Text>
    {state.cli.entries.map((entry) => (
      <Text key={`sys-${entry.seq}`}>
        {formatTreeLine("system", entry.level, undefined, entry.message, entry.timestamp)}
      </Text>
    ))}
  </>
)}
```

Add import for `CHROME` from `./monokai-palette.js`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/rendering-fixes-system-node.test.ts`
Expected: PASS

- [ ] **Step 6: Run existing tree-format tests to verify no regressions**

Run: `bun --bun vitest run src/__tests__/tree-format-dashboard.test.ts`
Expected: Some tests may fail because `buildTreePrefix("cli")` now returns `"│ "` instead of `""`, and `formatTreeLine("cli", ...)` now includes prefix. Fix assertions in existing tests.

- [ ] **Step 7: Commit**

```bash
git add cli/src/dashboard/tree-format.ts cli/src/dashboard/TreeView.tsx cli/src/__tests__/rendering-fixes-system-node.test.ts
git commit -m "feat(rendering-fixes): rename CLI to SYSTEM with hierarchical tree prefix"
```

---

## Task 2: Use session phase for dynamic node status badges

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-tree-state.ts:94-95,110`
- Create: `cli/src/__tests__/rendering-fixes-dynamic-status.test.ts`

- [ ] **Step 1: Write failing tests for dynamic status**

```typescript
import { describe, test, expect } from "vitest";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import type { EnrichedEpic, Feature } from "../store/types.js";

function mockFeature(slug: string, status: Feature["status"], parent = "epic-1"): Feature {
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

describe("dynamic node status badges", () => {
  test("dynamic epic node uses session phase as status", () => {
    const sessions = [{ epicSlug: "unknown-epic", phase: "implement" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries);
    const epic = state.epics.find(e => e.slug === "unknown-epic")!;
    expect(epic.status).toBe("implement");
  });

  test("dynamic epic node uses design phase", () => {
    const sessions = [{ epicSlug: "new-epic", phase: "design" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries);
    const epic = state.epics.find(e => e.slug === "new-epic")!;
    expect(epic.status).toBe("design");
  });

  test("dynamic feature node uses in-progress status", () => {
    const sessions = [{ epicSlug: "epic-x", phase: "implement", featureSlug: "feat-y" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries);
    const epic = state.epics.find(e => e.slug === "epic-x")!;
    const feat = epic.features.find(f => f.slug === "feat-y")!;
    expect(feat.status).toBe("in-progress");
  });

  test("store-seeded epic retains canonical status even when session phase differs", () => {
    const epics = [mockEpic("my-epic", "validate")];
    const sessions = [{ epicSlug: "my-epic", phase: "implement" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, epics);
    const epic = state.epics.find(e => e.slug === "my-epic")!;
    expect(epic.status).toBe("validate"); // store wins
  });

  test("store-seeded feature retains canonical status", () => {
    const epics = [mockEpic("my-epic", "implement", [mockFeature("my-feat", "completed", "my-epic")])];
    const sessions = [{ epicSlug: "my-epic", phase: "implement", featureSlug: "my-feat" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, epics);
    const feat = state.epics[0].features.find(f => f.slug === "my-feat")!;
    expect(feat.status).toBe("completed"); // store wins
  });

  test("no unknown badges appear for active sessions", () => {
    const sessions = [
      { epicSlug: "a", phase: "design" },
      { epicSlug: "b", phase: "plan", featureSlug: "f1" },
      { epicSlug: "c", phase: "release" },
    ];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries);
    for (const epic of state.epics) {
      expect(epic.status).not.toBe("unknown");
      for (const feat of epic.features) {
        expect(feat.status).not.toBe("unknown");
      }
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --bun vitest run src/__tests__/rendering-fixes-dynamic-status.test.ts`
Expected: FAIL — `epic.status` is `"unknown"`, not session phase

- [ ] **Step 3: Implement buildTreeState changes**

In `cli/src/dashboard/hooks/use-dashboard-tree-state.ts`, line 95, change:
```typescript
epic = { slug: session.epicSlug, status: "unknown", features: [], entries: [] };
```
to:
```typescript
epic = { slug: session.epicSlug, status: session.phase, features: [], entries: [] };
```

At line 110, change:
```typescript
feature = { slug: session.featureSlug, status: "unknown", entries: [] };
```
to:
```typescript
feature = { slug: session.featureSlug, status: "in-progress", entries: [] };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/rendering-fixes-dynamic-status.test.ts`
Expected: PASS

- [ ] **Step 5: Run existing build-tree-state tests**

Run: `bun --bun vitest run src/__tests__/build-tree-state.test.ts`
Expected: Some existing tests may assert `"unknown"` status for dynamic nodes — update those assertions to match new behavior.

- [ ] **Step 6: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-tree-state.ts cli/src/__tests__/rendering-fixes-dynamic-status.test.ts
git commit -m "feat(rendering-fixes): use session phase for dynamic epic nodes, in-progress for features"
```
