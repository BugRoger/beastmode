# Sort Epics by Date — Implementation Tasks

## Goal

Add a two-tier sort comparator to `listEnrichedFromStore()` in `scan.ts` so epics are sorted: active statuses above terminal (done/cancelled), newest-first within each group by `created_at` descending. Both dashboard and CLI status inherit this ordering automatically.

## Architecture

- **Sort location:** `listEnrichedFromStore()` in `cli/src/store/scan.ts` — the single shared function consumed by dashboard and CLI
- **Sort key:** `created_at` ISO 8601 string (already on Epic entity)
- **Grouping:** Active phases (design, plan, implement, validate, release) above terminal phases (done, cancelled)
- **Within-group order:** `created_at` descending (newest first)
- **"(all)" entry:** Pinned at index 0 in `buildFlatRows()` — unaffected by this change

## Tech Stack

- TypeScript, Bun, Vitest
- Test command: `cd cli && bun --bun vitest run`

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/src/store/scan.ts` | Modify | Add `TERMINAL_STATUSES` set and `compareEpics()` comparator, apply `.sort()` in `listEnrichedFromStore()` |
| `cli/src/__tests__/scan-sort.test.ts` | Create | Unit tests for the sort comparator |
| `cli/src/__tests__/epics-panel.test.ts` | Modify | Update `STATUS_ORDER` and `sortEpics()` to match new sort contract |

---

### Task 0: Integration Test

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/sort-epics-by-date.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, test, expect } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";
import { listEnrichedFromStore } from "../store/scan.js";
import type { Epic } from "../store/types.js";

/**
 * @epic-sort-by-date
 * Integration test: Epics are sorted by status group and creation date
 */

function addEpic(
  store: InMemoryTaskStore,
  name: string,
  status: Epic["status"],
  createdAt: string,
): void {
  const epic = store.addEpic({ name, slug: name });
  store.updateEpic(epic.id, { status, updated_at: createdAt });
  // Patch created_at via direct entity access
  const entity = store.getEpic(epic.id)!;
  (entity as Record<string, unknown>).created_at = createdAt;
}

function setupBackground(): InMemoryTaskStore {
  const store = new InMemoryTaskStore();
  addEpic(store, "old-epic", "implement", "2025-01-15T00:00:00.000Z");
  addEpic(store, "mid-epic", "plan", "2025-06-10T00:00:00.000Z");
  addEpic(store, "new-epic", "design", "2025-12-01T00:00:00.000Z");
  addEpic(store, "done-epic", "done", "2025-11-20T00:00:00.000Z");
  addEpic(store, "cancelled-epic", "cancelled", "2025-12-15T00:00:00.000Z");
  return store;
}

describe("@epic-sort-by-date: Epics sorted by status group and creation date", () => {
  test("Active epics appear newest-first by creation date", () => {
    const store = setupBackground();
    const epics = listEnrichedFromStore(store);
    const slugs = epics.map((e) => e.slug);

    const newIdx = slugs.indexOf("new-epic");
    const midIdx = slugs.indexOf("mid-epic");
    const oldIdx = slugs.indexOf("old-epic");

    expect(newIdx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(oldIdx);
  });

  test("Done and cancelled epics appear below all active epics", () => {
    const store = setupBackground();
    const epics = listEnrichedFromStore(store);
    const slugs = epics.map((e) => e.slug);

    const activeEpics = ["new-epic", "mid-epic", "old-epic"];
    const terminalEpics = ["done-epic", "cancelled-epic"];

    const lastActiveIdx = Math.max(...activeEpics.map((s) => slugs.indexOf(s)));
    const firstTerminalIdx = Math.min(...terminalEpics.map((s) => slugs.indexOf(s)));

    expect(lastActiveIdx).toBeLessThan(firstTerminalIdx);
  });

  test("Done and cancelled epics are sorted newest-first within their group", () => {
    const store = setupBackground();
    const epics = listEnrichedFromStore(store);
    const slugs = epics.map((e) => e.slug);

    const cancelledIdx = slugs.indexOf("cancelled-epic");
    const doneIdx = slugs.indexOf("done-epic");

    // cancelled-epic created 2025-12-15, done-epic created 2025-11-20
    expect(cancelledIdx).toBeLessThan(doneIdx);
  });

  test("Epics in any active phase sort above terminal-state epics", () => {
    const activePhases: Epic["status"][] = ["design", "plan", "implement", "validate", "release"];
    const terminalPhases: Epic["status"][] = ["done", "cancelled"];

    for (const activePhase of activePhases) {
      for (const terminalPhase of terminalPhases) {
        const store = new InMemoryTaskStore();
        addEpic(store, "active-one", activePhase, "2025-03-01T00:00:00.000Z");
        addEpic(store, "terminal-one", terminalPhase, "2025-09-01T00:00:00.000Z");

        const epics = listEnrichedFromStore(store);
        const slugs = epics.map((e) => e.slug);

        expect(slugs.indexOf("active-one")).toBeLessThan(slugs.indexOf("terminal-one"));
      }
    }
  });

  test("A newly created epic appears at the top of the active group", () => {
    const store = setupBackground();
    // Add a brand-new epic with latest date
    addEpic(store, "brand-new", "design", "2026-01-01T00:00:00.000Z");

    const epics = listEnrichedFromStore(store);
    const activeEpics = epics.filter(
      (e) => e.status !== "done" && e.status !== "cancelled",
    );

    expect(activeEpics[0].slug).toBe("brand-new");
  });

  test("An epic transitioning to done moves to the completed group", () => {
    const store = setupBackground();
    // Transition new-epic to done
    const newEpic = [...(store as InMemoryTaskStore).listEpics()].find(
      (e) => e.slug === "new-epic",
    )!;
    store.updateEpic(newEpic.id, { status: "done" });

    const epics = listEnrichedFromStore(store);
    const activeEpics = epics.filter(
      (e) => e.status !== "done" && e.status !== "cancelled",
    );
    const terminalEpics = epics.filter(
      (e) => e.status === "done" || e.status === "cancelled",
    );

    expect(activeEpics.map((e) => e.slug)).not.toContain("new-epic");
    expect(terminalEpics.map((e) => e.slug)).toContain("new-epic");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/sort-epics-by-date.integration.test.ts`
Expected: FAIL — epics are returned in insertion order, not sorted

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/sort-epics-by-date.integration.test.ts
git commit -m "test(sort-epics-by-date): add integration test — RED"
```

---

### Task 1: Add sort comparator to scan.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/store/scan.ts:85-98`
- Create: `cli/src/__tests__/scan-sort.test.ts`

- [ ] **Step 1: Write the unit test for compareEpics**

```typescript
import { describe, test, expect } from "vitest";
import { compareEpics } from "../store/scan.js";
import type { Epic } from "../store/types.js";

function makeEpic(slug: string, status: Epic["status"], createdAt: string): Epic {
  return {
    id: `bm-${slug}`,
    type: "epic",
    name: slug,
    slug,
    status,
    depends_on: [],
    created_at: createdAt,
    updated_at: createdAt,
  };
}

describe("compareEpics", () => {
  test("active epic sorts before done epic", () => {
    const a = makeEpic("active", "implement", "2025-01-01T00:00:00.000Z");
    const b = makeEpic("done", "done", "2025-06-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeLessThan(0);
  });

  test("active epic sorts before cancelled epic", () => {
    const a = makeEpic("active", "design", "2025-01-01T00:00:00.000Z");
    const b = makeEpic("cancelled", "cancelled", "2025-12-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeLessThan(0);
  });

  test("done epic sorts after active epic", () => {
    const a = makeEpic("done", "done", "2025-12-01T00:00:00.000Z");
    const b = makeEpic("active", "plan", "2025-01-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeGreaterThan(0);
  });

  test("newer active epic sorts before older active epic", () => {
    const a = makeEpic("new", "design", "2025-12-01T00:00:00.000Z");
    const b = makeEpic("old", "implement", "2025-01-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeLessThan(0);
  });

  test("newer terminal epic sorts before older terminal epic", () => {
    const a = makeEpic("new-done", "done", "2025-12-01T00:00:00.000Z");
    const b = makeEpic("old-done", "done", "2025-01-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeLessThan(0);
  });

  test("equal timestamps return 0", () => {
    const a = makeEpic("x", "plan", "2025-06-01T00:00:00.000Z");
    const b = makeEpic("y", "implement", "2025-06-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBe(0);
  });

  test("both terminal same group — newer first", () => {
    const a = makeEpic("cancelled", "cancelled", "2025-12-15T00:00:00.000Z");
    const b = makeEpic("done", "done", "2025-11-20T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeLessThan(0);
  });

  test("all active phases sort above done", () => {
    const phases: Epic["status"][] = ["design", "plan", "implement", "validate", "release"];
    for (const phase of phases) {
      const a = makeEpic("a", phase, "2025-01-01T00:00:00.000Z");
      const b = makeEpic("b", "done", "2025-12-01T00:00:00.000Z");
      expect(compareEpics(a, b)).toBeLessThan(0);
    }
  });

  test("all active phases sort above cancelled", () => {
    const phases: Epic["status"][] = ["design", "plan", "implement", "validate", "release"];
    for (const phase of phases) {
      const a = makeEpic("a", phase, "2025-01-01T00:00:00.000Z");
      const b = makeEpic("b", "cancelled", "2025-12-01T00:00:00.000Z");
      expect(compareEpics(a, b)).toBeLessThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/scan-sort.test.ts`
Expected: FAIL — `compareEpics` is not exported from scan.ts

- [ ] **Step 3: Implement the comparator and apply sort**

In `cli/src/store/scan.ts`, add the `TERMINAL_STATUSES` set and `compareEpics` function, then apply `.sort()` in `listEnrichedFromStore()`:

```typescript
/** Terminal statuses — sorted below active epics. */
const TERMINAL_STATUSES = new Set(["done", "cancelled"]);

/**
 * Compare two epics for sorting:
 * 1. Active epics before terminal (done/cancelled)
 * 2. Within each group, newest first by created_at
 */
export function compareEpics(a: Epic, b: Epic): number {
  const aTerminal = TERMINAL_STATUSES.has(a.status) ? 1 : 0;
  const bTerminal = TERMINAL_STATUSES.has(b.status) ? 1 : 0;
  if (aTerminal !== bTerminal) return aTerminal - bTerminal;
  // Descending by created_at (newest first) — ISO 8601 strings compare lexicographically
  return b.created_at.localeCompare(a.created_at);
}
```

And modify `listEnrichedFromStore()` to sort before returning:

```typescript
export function listEnrichedFromStore(store: TaskStore): EnrichedEpic[] {
  const epics = store.listEpics();

  const enriched = epics.map((epic) => {
    const features = store.listFeatures(epic.id);
    const nextAction = deriveNextAction(epic, features);

    return {
      ...epic,
      nextAction,
      features,
    };
  });

  return enriched.sort(compareEpics);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/scan-sort.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/store/scan.ts cli/src/__tests__/scan-sort.test.ts
git commit -m "feat(sort-epics-by-date): add compareEpics and sort in listEnrichedFromStore"
```

---

### Task 2: Update test helpers in epics-panel.test.ts

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/epics-panel.test.ts:366-467`

- [ ] **Step 1: Update STATUS_ORDER and sortEpics to match new sort contract**

Replace the existing `STATUS_ORDER` and `sortEpics()` in Group 4 to match the new two-tier sort (active/terminal grouping + created_at descending):

```typescript
const STATUS_ORDER: Record<string, number> = {
  design: 0,
  plan: 0,
  implement: 0,
  validate: 0,
  release: 0,
  done: 1,
  cancelled: 1,
};

interface FakeEpic {
  slug: string;
  status: string;
  created_at: string;
}

function sortEpics(epics: FakeEpic[]): FakeEpic[] {
  return [...epics].sort((a, b) => {
    const aGroup = STATUS_ORDER[a.status] ?? 99;
    const bGroup = STATUS_ORDER[b.status] ?? 99;
    if (aGroup !== bGroup) return aGroup - bGroup;
    return b.created_at.localeCompare(a.created_at);
  });
}
```

- [ ] **Step 2: Update existing sort tests to match new contract**

Replace tests that expect phase-progress ordering with active/terminal + date ordering:

```typescript
test("sort puts active epics before terminal epics", () => {
  const epics: FakeEpic[] = [
    { slug: "done-one", status: "done", created_at: "2025-12-01T00:00:00.000Z" },
    { slug: "active-one", status: "design", created_at: "2025-01-01T00:00:00.000Z" },
    { slug: "cancelled-one", status: "cancelled", created_at: "2025-11-01T00:00:00.000Z" },
  ];
  const sorted = sortEpics(epics);
  expect(sorted.map((e) => e.slug)).toEqual(["active-one", "done-one", "cancelled-one"]);
});

test("sort orders by created_at descending within same group", () => {
  const epics: FakeEpic[] = [
    { slug: "old", status: "implement", created_at: "2025-01-01T00:00:00.000Z" },
    { slug: "new", status: "plan", created_at: "2025-12-01T00:00:00.000Z" },
  ];
  const sorted = sortEpics(epics);
  expect(sorted.map((e) => e.slug)).toEqual(["new", "old"]);
});
```

- [ ] **Step 3: Update filter tests to include created_at field**

Add `created_at` to `FakeEpic` instances in the filter tests (toggle, name filter, etc.) so they match the updated interface:

Each `FakeEpic` in the filter tests gets a `created_at: "2025-06-01T00:00:00.000Z"` field.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/epics-panel.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/__tests__/epics-panel.test.ts
git commit -m "test(sort-epics-by-date): update epics-panel test helpers for date sort contract"
```

---

### Task 3: Run integration test — GREEN verification

**Wave:** 3
**Depends on:** Task 1, Task 2

**Files:**
- Test: `cli/src/__tests__/sort-epics-by-date.integration.test.ts`

- [ ] **Step 1: Run integration test**

Run: `cd cli && bun --bun vitest run src/__tests__/sort-epics-by-date.integration.test.ts`
Expected: PASS — all scenarios GREEN

- [ ] **Step 2: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — no regressions
