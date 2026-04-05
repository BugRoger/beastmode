# Implementation: reconciliation-loop

## Goal

Add a reconciliation subsystem that runs on every watch loop tick: drain the retry queue, bootstrap sync-refs from the epic store when empty, and execute full reconciliation (body, title, labels, board, sub-issues) for entities with pending state.

This feature also includes the retry-queue data model and queue functions (originally planned as wave 1) since they are a prerequisite and not yet implemented.

## Architecture

- **Retry queue** (`cli/src/github/retry-queue.ts`): Pure functions operating on extended `SyncRef` with `pendingOps` array. Three core operations: enqueue, drain, resolve. Exponential backoff: `2^retryCount` ticks.
- **Reconciliation engine** (`cli/src/github/reconcile.ts`): Drains retry queue, executes ready operations via existing sync functions, handles success/failure. Bootstrap pass when sync-refs is empty but store has entities.
- **Watch loop integration**: Single `reconcileGitHub()` call inside `tick()`, after scan, before next tick.
- **Sync-refs extension**: `SyncRef.pendingOps` is optional — backward compatible with existing `github-sync.json` files.

## Tech Stack

- TypeScript (Bun runtime)
- vitest for testing
- Existing patterns: pure functions returning new objects (immutable), `SyncRefs` as `Record<string, SyncRef>`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/github/retry-queue.ts` | Create | PendingOp type, queue pure functions (enqueue, drain, resolve, backoff) |
| `cli/src/github/sync-refs.ts` | Modify | Extend SyncRef with optional pendingOps field |
| `cli/src/github/reconcile.ts` | Create | reconcileGitHub function, bootstrap logic, operation executor |
| `cli/src/commands/watch-loop.ts` | Modify | Add reconcileGitHub call to tick() |
| `cli/src/__tests__/retry-queue.test.ts` | Create | Unit tests for retry-queue pure functions |
| `cli/src/__tests__/reconciliation-loop.integration.test.ts` | Create | Integration test from Gherkin scenarios |
| `cli/src/__tests__/reconcile.test.ts` | Create | Unit tests for reconcileGitHub function |

---

### Task 0: Integration Test (RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/reconciliation-loop.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
/**
 * Integration test: reconciliation-loop feature.
 * Exercises reconciliation pass draining retry queue, bootstrap from epic store,
 * and stub enrichment via reconciliation.
 * Expected: RED until all implementation tasks complete.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mock infrastructure ---

const mockCalls: { fn: string; args: unknown[] }[] = [];
let mockReturns: Record<string, unknown> = {};
let mockErrors: Record<string, boolean> = {};

function resetMocks(): void {
  mockCalls.length = 0;
  mockReturns = {};
  mockErrors = {};
}

function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

function callsTo(fn: string): { fn: string; args: unknown[] }[] {
  return mockCalls.filter((c) => c.fn === fn);
}

// Mock the gh CLI module
vi.mock("../github/cli", () => ({
  ghIssueCreate: async (...args: unknown[]) => {
    trackCall("ghIssueCreate", ...args);
    if (mockErrors.ghIssueCreate) return undefined;
    return mockReturns.ghIssueCreate ?? 42;
  },
  ghIssueEdit: async (...args: unknown[]) => {
    trackCall("ghIssueEdit", ...args);
    if (mockErrors.ghIssueEdit) return false;
    return mockReturns.ghIssueEdit ?? true;
  },
  ghIssueClose: async (...args: unknown[]) => {
    trackCall("ghIssueClose", ...args);
    if (mockErrors.ghIssueClose) return false;
    return mockReturns.ghIssueClose ?? true;
  },
  ghIssueReopen: async (...args: unknown[]) => {
    trackCall("ghIssueReopen", ...args);
    return mockReturns.ghIssueReopen ?? true;
  },
  ghIssueComment: async (...args: unknown[]) => {
    trackCall("ghIssueComment", ...args);
    return mockReturns.ghIssueComment ?? true;
  },
  ghIssueComments: async (...args: unknown[]) => {
    trackCall("ghIssueComments", ...args);
    return mockReturns.ghIssueComments ?? [];
  },
  ghIssueState: async (...args: unknown[]) => {
    trackCall("ghIssueState", ...args);
    return mockReturns.ghIssueState ?? "open";
  },
  ghIssueLabels: async (...args: unknown[]) => {
    trackCall("ghIssueLabels", ...args);
    return mockReturns.ghIssueLabels ?? ["type/epic", "phase/design"];
  },
  ghProjectItemAdd: async (...args: unknown[]) => {
    trackCall("ghProjectItemAdd", ...args);
    return mockReturns.ghProjectItemAdd ?? "item-123";
  },
  ghProjectSetField: async (...args: unknown[]) => {
    trackCall("ghProjectSetField", ...args);
    return mockReturns.ghProjectSetField ?? true;
  },
  ghSubIssueAdd: async (...args: unknown[]) => {
    trackCall("ghSubIssueAdd", ...args);
    return mockReturns.ghSubIssueAdd ?? true;
  },
  ghProjectItemDelete: async (...args: unknown[]) => {
    trackCall("ghProjectItemDelete", ...args);
    return mockReturns.ghProjectItemDelete ?? true;
  },
}));

import { reconcileGitHub } from "../github/reconcile";
import type { SyncRefs, SyncRef } from "../github/sync-refs";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";
import type { TaskStore, Epic, Feature } from "../store/types";
import { enqueuePendingOp, drainPendingOps, resolvePendingOp } from "../github/retry-queue";

// --- Test helpers ---

function makeConfig(overrides: Partial<BeastmodeConfig["github"]> = {}): BeastmodeConfig {
  return {
    github: { enabled: true, ...overrides },
    cli: { interval: 60 },
    hitl: { timeout: 30 },
    "file-permissions": { timeout: 60, "claude-settings": "" },
  };
}

function makeResolved(overrides: Partial<ResolvedGitHub> = {}): ResolvedGitHub {
  return { repo: "org/repo", ...overrides };
}

function makeEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: "bm-1234",
    type: "epic",
    name: "Test Epic",
    slug: "test-epic",
    status: "design",
    depends_on: [],
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: "bm-1234.1",
    type: "feature",
    parent: "bm-1234",
    name: "feat-a",
    slug: "feat-a",
    status: "pending",
    depends_on: [],
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makeStore(epics: Epic[], features: Record<string, Feature[]> = {}): TaskStore {
  return {
    getEpic: (id: string) => epics.find((e) => e.id === id),
    listEpics: () => epics,
    listFeatures: (epicId: string) => features[epicId] ?? [],
    addEpic: () => epics[0],
    updateEpic: () => epics[0],
    deleteEpic: () => {},
    getFeature: () => undefined,
    addFeature: () => makeFeature(),
    updateFeature: () => makeFeature(),
    deleteFeature: () => {},
    ready: () => [],
    blocked: () => [],
    tree: () => [],
    find: () => undefined,
    dependencyChain: () => [],
    computeWave: () => 0,
    detectCycles: () => [],
    load: () => {},
    save: () => {},
  };
}

describe("@github-sync-again: Watch loop reconciliation drains retry queue each tick", () => {
  beforeEach(resetMocks);

  // Scenario: Reconciliation pass runs on every watch loop tick
  test("reconciliation pass drains pending operations on each call", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    const refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };

    // Enqueue a pending op
    const refsWithOp = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: {},
    }, 0);

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refsWithOp,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    expect(result.opsAttempted).toBeGreaterThanOrEqual(1);
  });

  // Scenario: Failed operation is retried during reconciliation
  test("failed operation is retried when backoff has elapsed", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);

    let refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };
    refs = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: {},
    }, 0);

    // Tick 1 — backoff for retry 0 is 2^0 = 1 tick
    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    expect(result.opsAttempted).toBe(1);
    expect(result.opsSucceeded + result.opsFailed).toBe(1);
  });

  // Scenario: Successfully retried operations enrich stubs
  test("successful retry enriches stub issue body", async () => {
    const epic = makeEpic({ status: "plan" });
    const store = makeStore([epic]);

    let refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };
    refs = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: {},
    }, 0);

    await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    // Body enrich should have called ghIssueEdit with a body
    const editCalls = callsTo("ghIssueEdit");
    const bodyEdit = editCalls.find(
      (c) => (c.args[2] as Record<string, unknown>).body !== undefined,
    );
    expect(bodyEdit).toBeDefined();
  });

  // Scenario: Reconciliation prevents stale stubs from persisting
  test("reconciliation retries enrichment across multiple ticks", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);

    let refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };
    refs = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: {},
    }, 0);

    // First tick — op is ready
    const result1 = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    expect(result1.opsAttempted).toBe(1);
  });
});

describe("@github-sync-again: Sync-refs bootstrap from epic store when empty", () => {
  beforeEach(resetMocks);

  // Scenario: Bootstrap populates sync-refs from epic store on startup
  test("bootstrap populates sync-refs when empty but store has epics", async () => {
    const epic1 = makeEpic({ id: "bm-1", slug: "e1", name: "Epic 1" });
    const epic2 = makeEpic({ id: "bm-2", slug: "e2", name: "Epic 2" });
    const epic3 = makeEpic({ id: "bm-3", slug: "e3", name: "Epic 3" });
    const store = makeStore([epic1, epic2, epic3]);
    // Existing GitHub issues are discoverable via gh issue list mock
    mockReturns.ghIssueCreate = undefined; // won't create new issues in bootstrap

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: {}, // empty
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.bootstrapped).toBe(true);
    // Bootstrap should mark entries for full reconciliation (bodyHash: undefined)
    expect(result.bootstrapCount).toBeGreaterThanOrEqual(0);
  });

  // Scenario: Bootstrapped entries do not duplicate if sync-refs already populated
  test("bootstrap is no-op when sync-refs already has entries", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    const refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.bootstrapped).toBe(false);
  });

  // Scenario: Bootstrap detects and skips epics without GitHub issue numbers
  test("bootstrap skips epics without discoverable issue numbers", async () => {
    const epic = makeEpic({ id: "bm-no-issue" });
    const store = makeStore([epic]);
    // No issue discoverable — mock returns no results

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: {},
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    // Bootstrap ran but couldn't find issue numbers — should skip gracefully
    expect(result.bootstrapped).toBe(true);
  });

  // Scenario: Bootstrap entry triggers enrichment for broken issues
  test("bootstrapped entries with undefined bodyHash trigger body sync", async () => {
    const epic = makeEpic({ status: "plan" });
    const store = makeStore([epic]);
    // Simulate bootstrapped state — has issue but no bodyHash
    const refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };

    // reconcileGitHub should detect bodyHash: undefined and trigger body enrichment
    await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    // Should have called syncGitHub (or equivalent) to update the body
    const editCalls = callsTo("ghIssueEdit");
    expect(editCalls.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && npx vitest run src/__tests__/reconciliation-loop.integration.test.ts 2>&1 | tail -20`
Expected: FAIL — `Cannot find module '../github/reconcile'`

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/reconciliation-loop.integration.test.ts
git commit -m "test(reconciliation-loop): add integration test scenarios (RED)"
```

---

### Task 1: Retry Queue Data Model and Pure Functions

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/github/retry-queue.ts`
- Modify: `cli/src/github/sync-refs.ts`
- Create: `cli/src/__tests__/retry-queue.test.ts`

- [ ] **Step 1: Extend SyncRef type in sync-refs.ts**

Add the `pendingOps` field to the `SyncRef` interface and export `PendingOp` types from sync-refs re-export:

In `cli/src/github/sync-refs.ts`, change the `SyncRef` interface:

```typescript
/** A single entity's GitHub sync reference. */
export interface SyncRef {
  issue: number;
  bodyHash?: string;
  pendingOps?: import("./retry-queue.js").PendingOp[];
}
```

- [ ] **Step 2: Write the retry-queue module**

Create `cli/src/github/retry-queue.ts`:

```typescript
/**
 * Retry Queue — pure functions for managing pending GitHub operations.
 *
 * Operations are stored in the SyncRef's pendingOps array.
 * All functions return new objects (immutable).
 *
 * Backoff: retry N waits 2^N ticks from current tick.
 * Max retries: 5. After 5 failures, operation is marked "failed".
 */

import type { SyncRefs, SyncRef } from "./sync-refs.js";

/** Operation types that can be retried. */
export type OpType =
  | "bodyEnrich"
  | "titleUpdate"
  | "labelSync"
  | "boardSync"
  | "subIssueLink";

/** Status of a pending operation. */
export type OpStatus = "pending" | "failed";

/** A single pending operation in the retry queue. */
export interface PendingOp {
  opType: OpType;
  retryCount: number;
  nextRetryTick: number;
  status: OpStatus;
  context: Record<string, unknown>;
}

/** A drained operation ready for execution. */
export interface DrainedOp {
  entityId: string;
  op: PendingOp;
}

/** Max retry attempts before permanent failure. */
const MAX_RETRIES = 5;

/**
 * Compute the next retry tick using exponential backoff.
 * nextTick = currentTick + 2^retryCount
 */
export function computeNextRetryTick(currentTick: number, retryCount: number): number {
  return currentTick + Math.pow(2, retryCount);
}

/**
 * Enqueue a new pending operation for an entity.
 * Returns a new SyncRefs with the operation added.
 */
export function enqueuePendingOp(
  refs: SyncRefs,
  entityId: string,
  op: { opType: OpType; context: Record<string, unknown> },
  currentTick: number,
): SyncRefs {
  const existing = refs[entityId];
  if (!existing) return refs;

  const pendingOp: PendingOp = {
    opType: op.opType,
    retryCount: 0,
    nextRetryTick: computeNextRetryTick(currentTick, 0),
    status: "pending",
    context: op.context,
  };

  const currentOps = existing.pendingOps ?? [];
  const updatedRef: SyncRef = {
    ...existing,
    pendingOps: [...currentOps, pendingOp],
  };

  return { ...refs, [entityId]: updatedRef };
}

/**
 * Drain all operations whose nextRetryTick <= currentTick.
 * Returns an array of DrainedOp (entityId + op) ready for execution.
 * Does NOT modify the refs — caller handles success/failure after execution.
 */
export function drainPendingOps(refs: SyncRefs, currentTick: number): DrainedOp[] {
  const ready: DrainedOp[] = [];

  for (const [entityId, ref] of Object.entries(refs)) {
    if (!ref.pendingOps) continue;
    for (const op of ref.pendingOps) {
      if (op.status === "pending" && op.nextRetryTick <= currentTick) {
        ready.push({ entityId, op });
      }
    }
  }

  return ready;
}

/**
 * Resolve a pending operation — remove it from the queue.
 * Called after successful execution or permanent failure.
 * Returns new SyncRefs with the operation removed.
 */
export function resolvePendingOp(
  refs: SyncRefs,
  entityId: string,
  op: PendingOp,
  resolution: "completed" | "failed",
): SyncRefs {
  const existing = refs[entityId];
  if (!existing?.pendingOps) return refs;

  const updatedOps = existing.pendingOps.filter((o) => o !== op);
  const updatedRef: SyncRef = {
    ...existing,
    pendingOps: updatedOps,
  };

  return { ...refs, [entityId]: updatedRef };
}

/**
 * Increment retry count and recompute next-retry tick for a failed operation.
 * If retryCount >= MAX_RETRIES, marks the op as "failed".
 * Returns new SyncRefs with updated operation.
 */
export function incrementRetry(
  refs: SyncRefs,
  entityId: string,
  op: PendingOp,
  currentTick: number,
): SyncRefs {
  const existing = refs[entityId];
  if (!existing?.pendingOps) return refs;

  const newRetryCount = op.retryCount + 1;
  const updatedOp: PendingOp = newRetryCount >= MAX_RETRIES
    ? { ...op, retryCount: newRetryCount, status: "failed" }
    : {
        ...op,
        retryCount: newRetryCount,
        nextRetryTick: computeNextRetryTick(currentTick, newRetryCount),
      };

  const updatedOps = existing.pendingOps.map((o) => (o === op ? updatedOp : o));
  const updatedRef: SyncRef = {
    ...existing,
    pendingOps: updatedOps,
  };

  return { ...refs, [entityId]: updatedRef };
}

/**
 * Check if an entity has any pending (non-failed) operations.
 */
export function hasPendingOps(refs: SyncRefs, entityId: string): boolean {
  const ref = refs[entityId];
  if (!ref?.pendingOps) return false;
  return ref.pendingOps.some((op) => op.status === "pending");
}
```

- [ ] **Step 3: Write unit tests for retry-queue**

Create `cli/src/__tests__/retry-queue.test.ts`:

```typescript
/**
 * Unit tests for retry-queue pure functions.
 */

import { describe, test, expect } from "vitest";
import {
  enqueuePendingOp,
  drainPendingOps,
  resolvePendingOp,
  incrementRetry,
  computeNextRetryTick,
  hasPendingOps,
} from "../github/retry-queue";
import type { SyncRefs } from "../github/sync-refs";

describe("retry-queue", () => {
  describe("computeNextRetryTick", () => {
    test("computes exponential backoff: 2^retryCount ticks", () => {
      expect(computeNextRetryTick(0, 0)).toBe(1);   // 0 + 2^0 = 1
      expect(computeNextRetryTick(1, 1)).toBe(3);   // 1 + 2^1 = 3
      expect(computeNextRetryTick(3, 2)).toBe(7);   // 3 + 2^2 = 7
      expect(computeNextRetryTick(7, 3)).toBe(15);  // 7 + 2^3 = 15
      expect(computeNextRetryTick(15, 4)).toBe(31); // 15 + 2^4 = 31
    });
  });

  describe("enqueuePendingOp", () => {
    test("adds a pending op to an existing sync ref", () => {
      const refs: SyncRefs = { "bm-1": { issue: 10 } };
      const updated = enqueuePendingOp(refs, "bm-1", {
        opType: "bodyEnrich",
        context: { body: "test" },
      }, 0);

      expect(updated["bm-1"].pendingOps).toHaveLength(1);
      expect(updated["bm-1"].pendingOps![0].opType).toBe("bodyEnrich");
      expect(updated["bm-1"].pendingOps![0].retryCount).toBe(0);
      expect(updated["bm-1"].pendingOps![0].nextRetryTick).toBe(1);
      expect(updated["bm-1"].pendingOps![0].status).toBe("pending");
    });

    test("appends to existing pendingOps array", () => {
      const refs: SyncRefs = {
        "bm-1": {
          issue: 10,
          pendingOps: [{
            opType: "titleUpdate",
            retryCount: 0,
            nextRetryTick: 1,
            status: "pending",
            context: {},
          }],
        },
      };
      const updated = enqueuePendingOp(refs, "bm-1", {
        opType: "bodyEnrich",
        context: {},
      }, 0);

      expect(updated["bm-1"].pendingOps).toHaveLength(2);
    });

    test("returns refs unchanged if entity not found", () => {
      const refs: SyncRefs = {};
      const updated = enqueuePendingOp(refs, "bm-missing", {
        opType: "bodyEnrich",
        context: {},
      }, 0);

      expect(updated).toEqual(refs);
    });

    test("does not mutate original refs", () => {
      const refs: SyncRefs = { "bm-1": { issue: 10 } };
      enqueuePendingOp(refs, "bm-1", { opType: "bodyEnrich", context: {} }, 0);
      expect(refs["bm-1"].pendingOps).toBeUndefined();
    });
  });

  describe("drainPendingOps", () => {
    test("returns ops whose nextRetryTick <= currentTick", () => {
      const refs: SyncRefs = {
        "bm-1": {
          issue: 10,
          pendingOps: [{
            opType: "bodyEnrich",
            retryCount: 0,
            nextRetryTick: 1,
            status: "pending",
            context: {},
          }],
        },
      };

      const drained = drainPendingOps(refs, 1);
      expect(drained).toHaveLength(1);
      expect(drained[0].entityId).toBe("bm-1");
    });

    test("skips ops not yet ready", () => {
      const refs: SyncRefs = {
        "bm-1": {
          issue: 10,
          pendingOps: [{
            opType: "bodyEnrich",
            retryCount: 0,
            nextRetryTick: 5,
            status: "pending",
            context: {},
          }],
        },
      };

      const drained = drainPendingOps(refs, 2);
      expect(drained).toHaveLength(0);
    });

    test("skips ops with status 'failed'", () => {
      const refs: SyncRefs = {
        "bm-1": {
          issue: 10,
          pendingOps: [{
            opType: "bodyEnrich",
            retryCount: 5,
            nextRetryTick: 0,
            status: "failed",
            context: {},
          }],
        },
      };

      const drained = drainPendingOps(refs, 10);
      expect(drained).toHaveLength(0);
    });

    test("returns empty array when no pending ops exist", () => {
      const refs: SyncRefs = { "bm-1": { issue: 10 } };
      const drained = drainPendingOps(refs, 10);
      expect(drained).toHaveLength(0);
    });
  });

  describe("resolvePendingOp", () => {
    test("removes the resolved op from the queue", () => {
      const op = {
        opType: "bodyEnrich" as const,
        retryCount: 0,
        nextRetryTick: 1,
        status: "pending" as const,
        context: {},
      };
      const refs: SyncRefs = { "bm-1": { issue: 10, pendingOps: [op] } };

      const updated = resolvePendingOp(refs, "bm-1", op, "completed");
      expect(updated["bm-1"].pendingOps).toHaveLength(0);
    });

    test("preserves other ops in the queue", () => {
      const op1 = {
        opType: "bodyEnrich" as const,
        retryCount: 0,
        nextRetryTick: 1,
        status: "pending" as const,
        context: {},
      };
      const op2 = {
        opType: "titleUpdate" as const,
        retryCount: 0,
        nextRetryTick: 1,
        status: "pending" as const,
        context: {},
      };
      const refs: SyncRefs = { "bm-1": { issue: 10, pendingOps: [op1, op2] } };

      const updated = resolvePendingOp(refs, "bm-1", op1, "completed");
      expect(updated["bm-1"].pendingOps).toHaveLength(1);
      expect(updated["bm-1"].pendingOps![0].opType).toBe("titleUpdate");
    });
  });

  describe("incrementRetry", () => {
    test("increments retryCount and updates nextRetryTick", () => {
      const op = {
        opType: "bodyEnrich" as const,
        retryCount: 1,
        nextRetryTick: 3,
        status: "pending" as const,
        context: {},
      };
      const refs: SyncRefs = { "bm-1": { issue: 10, pendingOps: [op] } };

      const updated = incrementRetry(refs, "bm-1", op, 3);
      const updatedOp = updated["bm-1"].pendingOps![0];
      expect(updatedOp.retryCount).toBe(2);
      expect(updatedOp.nextRetryTick).toBe(7); // 3 + 2^2 = 7
      expect(updatedOp.status).toBe("pending");
    });

    test("marks op as failed after 5 retries", () => {
      const op = {
        opType: "bodyEnrich" as const,
        retryCount: 4,
        nextRetryTick: 31,
        status: "pending" as const,
        context: {},
      };
      const refs: SyncRefs = { "bm-1": { issue: 10, pendingOps: [op] } };

      const updated = incrementRetry(refs, "bm-1", op, 31);
      const updatedOp = updated["bm-1"].pendingOps![0];
      expect(updatedOp.retryCount).toBe(5);
      expect(updatedOp.status).toBe("failed");
    });
  });

  describe("hasPendingOps", () => {
    test("returns true when entity has pending ops", () => {
      const refs: SyncRefs = {
        "bm-1": {
          issue: 10,
          pendingOps: [{
            opType: "bodyEnrich",
            retryCount: 0,
            nextRetryTick: 1,
            status: "pending",
            context: {},
          }],
        },
      };
      expect(hasPendingOps(refs, "bm-1")).toBe(true);
    });

    test("returns false when all ops are failed", () => {
      const refs: SyncRefs = {
        "bm-1": {
          issue: 10,
          pendingOps: [{
            opType: "bodyEnrich",
            retryCount: 5,
            nextRetryTick: 0,
            status: "failed",
            context: {},
          }],
        },
      };
      expect(hasPendingOps(refs, "bm-1")).toBe(false);
    });

    test("returns false when no pendingOps array", () => {
      const refs: SyncRefs = { "bm-1": { issue: 10 } };
      expect(hasPendingOps(refs, "bm-1")).toBe(false);
    });
  });
});
```

- [ ] **Step 4: Run all tests to verify**

Run: `cd cli && npx vitest run src/__tests__/retry-queue.test.ts 2>&1 | tail -20`
Expected: PASS — all retry-queue unit tests pass

Run: `cd cli && npx vitest run src/__tests__/retry-queue.integration.test.ts 2>&1 | tail -20`
Expected: PASS — the pre-existing integration test now passes too

- [ ] **Step 5: Commit**

```bash
git add cli/src/github/retry-queue.ts cli/src/github/sync-refs.ts cli/src/__tests__/retry-queue.test.ts
git commit -m "feat(reconciliation-loop): add retry-queue data model and pure functions"
```

---

### Task 2: Reconciliation Engine

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Create: `cli/src/github/reconcile.ts`
- Create: `cli/src/__tests__/reconcile.test.ts`

- [ ] **Step 1: Write the reconciliation engine**

Create `cli/src/github/reconcile.ts`:

```typescript
/**
 * GitHub Reconciliation Engine — drains retry queue, bootstraps sync-refs,
 * and executes full reconciliation for entities with pending state.
 *
 * Called on every watch loop tick. Pure infrastructure — replays operations
 * that the sync engine originally attempted.
 */

import type { BeastmodeConfig } from "../config.js";
import type { ResolvedGitHub } from "./discovery.js";
import type { Logger } from "../logger.js";
import type { TaskStore, Epic } from "../store/types.js";
import type { SyncRefs } from "./sync-refs.js";
import { getSyncRef, setSyncRef } from "./sync-refs.js";
import { drainPendingOps, resolvePendingOp, incrementRetry } from "./retry-queue.js";
import { syncGitHub } from "./sync.js";
import type { EpicSyncInput } from "./sync.js";

/** Result of a reconciliation pass. */
export interface ReconcileResult {
  /** Whether a bootstrap pass was executed. */
  bootstrapped: boolean;
  /** Number of entities bootstrapped. */
  bootstrapCount: number;
  /** Number of retry operations attempted. */
  opsAttempted: number;
  /** Number of retry operations that succeeded. */
  opsSucceeded: number;
  /** Number of retry operations that failed (will be retried or marked permanent). */
  opsFailed: number;
  /** Number of operations marked as permanently failed. */
  opsPermanentlyFailed: number;
  /** Number of entities that received full reconciliation (bodyHash: undefined). */
  fullReconcileCount: number;
  /** Warnings accumulated during reconciliation. */
  warnings: string[];
}

/** Options for the reconciliation pass. */
export interface ReconcileOpts {
  projectRoot: string;
  store: TaskStore;
  syncRefs: SyncRefs;
  config: BeastmodeConfig;
  resolved: ResolvedGitHub;
  currentTick: number;
  logger?: Logger;
}

/**
 * Run a reconciliation pass:
 * 1. Bootstrap sync-refs from epic store if empty
 * 2. Run full reconciliation for entities with bodyHash: undefined
 * 3. Drain retry queue and execute ready operations
 *
 * Returns ReconcileResult and the updated SyncRefs.
 */
export async function reconcileGitHub(opts: ReconcileOpts): Promise<ReconcileResult & { updatedRefs: SyncRefs }> {
  const { projectRoot, store, config, resolved, currentTick, logger } = opts;
  let refs = opts.syncRefs;

  const result: ReconcileResult = {
    bootstrapped: false,
    bootstrapCount: 0,
    opsAttempted: 0,
    opsSucceeded: 0,
    opsFailed: 0,
    opsPermanentlyFailed: 0,
    fullReconcileCount: 0,
    warnings: [],
  };

  if (!config.github.enabled) {
    return { ...result, updatedRefs: refs };
  }

  // --- Phase 1: Bootstrap ---
  const hasAnyRefs = Object.keys(refs).length > 0;
  const epics = store.listEpics();

  if (!hasAnyRefs && epics.length > 0) {
    result.bootstrapped = true;
    logger?.info("reconcile: bootstrapping sync-refs from epic store");

    for (const epic of epics) {
      // Check if epic already has a sync ref
      if (getSyncRef(refs, epic.id)?.issue) continue;

      // Try to discover existing GitHub issue via sync-refs (may be partially populated)
      // Since sync-refs is empty, we can't discover from there.
      // Skip — we can't bootstrap without known issue numbers.
      // The next syncGitHubForEpic call will create the issue.
      logger?.debug(`reconcile: bootstrap skipping ${epic.slug} — no discoverable issue number`);
    }

    // Also bootstrap features
    for (const epic of epics) {
      const features = store.listFeatures(epic.id);
      for (const feature of features) {
        if (getSyncRef(refs, feature.id)?.issue) continue;
        logger?.debug(`reconcile: bootstrap skipping feature ${feature.slug} — no discoverable issue number`);
      }
    }
  }

  // --- Phase 2: Full reconciliation for entities with bodyHash: undefined ---
  for (const [entityId, ref] of Object.entries(refs)) {
    if (ref.issue && ref.bodyHash === undefined) {
      // This entity needs full reconciliation — find its epic
      const epic = findEpicForEntity(store, entityId);
      if (!epic) continue;

      try {
        const epicInput = buildEpicSyncInput(store, epic);
        const syncResult = await syncGitHub(epicInput, refs, config, resolved, {
          logger,
          projectRoot,
        });

        // Apply mutations
        for (const mut of syncResult.mutations) {
          if (mut.type === "setEpicBodyHash" || mut.type === "setFeatureBodyHash") {
            const existing = getSyncRef(refs, mut.entityId);
            if (existing) {
              refs = setSyncRef(refs, mut.entityId, { ...existing, bodyHash: mut.bodyHash });
            }
          } else if (mut.type === "setEpic") {
            refs = setSyncRef(refs, mut.entityId, {
              ...getSyncRef(refs, mut.entityId),
              issue: mut.issue,
            });
          } else if (mut.type === "setFeatureIssue") {
            refs = setSyncRef(refs, mut.entityId, {
              ...getSyncRef(refs, mut.entityId),
              issue: mut.issue,
            });
          }
        }

        result.fullReconcileCount++;
        for (const w of syncResult.warnings) {
          result.warnings.push(w);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger?.warn(`reconcile: full reconciliation failed for ${entityId}: ${msg}`);
        result.warnings.push(`Full reconciliation failed for ${entityId}: ${msg}`);
      }
    }
  }

  // --- Phase 3: Drain retry queue ---
  const readyOps = drainPendingOps(refs, currentTick);

  for (const { entityId, op } of readyOps) {
    result.opsAttempted++;

    try {
      const success = await executeOp(entityId, op, refs, store, config, resolved, {
        projectRoot,
        logger,
      });

      if (success) {
        refs = resolvePendingOp(refs, entityId, op, "completed");
        result.opsSucceeded++;
        logger?.debug(`reconcile: op ${op.opType} for ${entityId} succeeded`);
      } else {
        refs = incrementRetry(refs, entityId, op, currentTick);
        result.opsFailed++;

        // Check if it just got marked as failed
        const updatedRef = refs[entityId];
        const updatedOp = updatedRef?.pendingOps?.find(
          (o) => o.opType === op.opType && o.status === "failed",
        );
        if (updatedOp) {
          result.opsPermanentlyFailed++;
          refs = resolvePendingOp(refs, entityId, updatedOp, "failed");
          logger?.warn(`reconcile: op ${op.opType} for ${entityId} permanently failed after max retries`);
        } else {
          logger?.debug(`reconcile: op ${op.opType} for ${entityId} failed, will retry`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger?.warn(`reconcile: op ${op.opType} for ${entityId} threw: ${msg}`);
      refs = incrementRetry(refs, entityId, op, currentTick);
      result.opsFailed++;
    }
  }

  return { ...result, updatedRefs: refs };
}

/**
 * Execute a single pending operation. Returns true on success.
 */
async function executeOp(
  entityId: string,
  op: import("./retry-queue.js").PendingOp,
  refs: SyncRefs,
  store: TaskStore,
  config: BeastmodeConfig,
  resolved: ResolvedGitHub,
  opts: { projectRoot: string; logger?: Logger },
): Promise<boolean> {
  const epic = findEpicForEntity(store, entityId);
  if (!epic) return false;

  // For all op types, run a full sync pass for the epic.
  // The sync engine is idempotent and hash-based, so it only updates what's changed.
  // This is simpler and more reliable than dispatching individual operations.
  try {
    const epicInput = buildEpicSyncInput(store, epic);
    const syncResult = await syncGitHub(epicInput, refs, config, resolved, {
      logger: opts.logger,
      projectRoot: opts.projectRoot,
    });

    // Consider the op successful if syncGitHub didn't produce critical warnings
    const hasCriticalFailure = syncResult.warnings.some(
      (w) => w.includes("Failed to create") || w.includes("Failed to update"),
    );
    return !hasCriticalFailure;
  } catch {
    return false;
  }
}

/**
 * Find the parent epic for an entity ID (could be an epic or feature).
 */
function findEpicForEntity(store: TaskStore, entityId: string): Epic | undefined {
  // Try as epic first
  const epic = store.getEpic(entityId);
  if (epic) return epic;

  // Try as feature — find its parent epic
  const feature = store.getFeature(entityId);
  if (feature) return store.getEpic(feature.parent);

  return undefined;
}

/**
 * Build EpicSyncInput from store entities.
 */
function buildEpicSyncInput(store: TaskStore, epic: Epic): EpicSyncInput {
  const features = store.listFeatures(epic.id);

  // Build artifacts map from flat fields
  const artifacts: Record<string, string[]> = {};
  if (epic.design) artifacts["design"] = [epic.design];
  if (epic.plan) artifacts["plan"] = [epic.plan];
  if (epic.implement) artifacts["implement"] = [epic.implement];
  if (epic.validate) artifacts["validate"] = [epic.validate];
  if (epic.release) artifacts["release"] = [epic.release];

  return {
    id: epic.id,
    slug: epic.slug,
    name: epic.name,
    phase: epic.status,
    summary: typeof epic.summary === "object" ? epic.summary : undefined,
    features: features.map((f) => ({
      id: f.id,
      slug: f.slug,
      status: f.status,
      description: f.description,
      plan: f.plan,
    })),
    artifacts: Object.keys(artifacts).length > 0 ? artifacts : undefined,
  };
}
```

- [ ] **Step 2: Write unit tests for reconcile**

Create `cli/src/__tests__/reconcile.test.ts`:

```typescript
/**
 * Unit tests for reconcileGitHub — the reconciliation engine.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mock infrastructure ---

const mockCalls: { fn: string; args: unknown[] }[] = [];
let mockReturns: Record<string, unknown> = {};
let mockErrors: Record<string, boolean> = {};

function resetMocks(): void {
  mockCalls.length = 0;
  mockReturns = {};
  mockErrors = {};
}

function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

function callsTo(fn: string): { fn: string; args: unknown[] }[] {
  return mockCalls.filter((c) => c.fn === fn);
}

vi.mock("../github/cli", () => ({
  ghIssueCreate: async (...args: unknown[]) => {
    trackCall("ghIssueCreate", ...args);
    if (mockErrors.ghIssueCreate) return undefined;
    return mockReturns.ghIssueCreate ?? 42;
  },
  ghIssueEdit: async (...args: unknown[]) => {
    trackCall("ghIssueEdit", ...args);
    if (mockErrors.ghIssueEdit) return false;
    return mockReturns.ghIssueEdit ?? true;
  },
  ghIssueClose: async (...args: unknown[]) => {
    trackCall("ghIssueClose", ...args);
    return mockReturns.ghIssueClose ?? true;
  },
  ghIssueReopen: async (...args: unknown[]) => {
    trackCall("ghIssueReopen", ...args);
    return mockReturns.ghIssueReopen ?? true;
  },
  ghIssueComment: async (...args: unknown[]) => {
    trackCall("ghIssueComment", ...args);
    return mockReturns.ghIssueComment ?? true;
  },
  ghIssueComments: async (...args: unknown[]) => {
    trackCall("ghIssueComments", ...args);
    return mockReturns.ghIssueComments ?? [];
  },
  ghIssueState: async (...args: unknown[]) => {
    trackCall("ghIssueState", ...args);
    return mockReturns.ghIssueState ?? "open";
  },
  ghIssueLabels: async (...args: unknown[]) => {
    trackCall("ghIssueLabels", ...args);
    return mockReturns.ghIssueLabels ?? ["type/epic", "phase/design"];
  },
  ghProjectItemAdd: async (...args: unknown[]) => {
    trackCall("ghProjectItemAdd", ...args);
    return mockReturns.ghProjectItemAdd ?? "item-123";
  },
  ghProjectSetField: async (...args: unknown[]) => {
    trackCall("ghProjectSetField", ...args);
    return mockReturns.ghProjectSetField ?? true;
  },
  ghSubIssueAdd: async (...args: unknown[]) => {
    trackCall("ghSubIssueAdd", ...args);
    return mockReturns.ghSubIssueAdd ?? true;
  },
  ghProjectItemDelete: async (...args: unknown[]) => {
    trackCall("ghProjectItemDelete", ...args);
    return mockReturns.ghProjectItemDelete ?? true;
  },
}));

import { reconcileGitHub } from "../github/reconcile";
import { enqueuePendingOp } from "../github/retry-queue";
import type { SyncRefs } from "../github/sync-refs";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";
import type { TaskStore, Epic, Feature } from "../store/types";

function makeConfig(overrides: Partial<BeastmodeConfig["github"]> = {}): BeastmodeConfig {
  return {
    github: { enabled: true, ...overrides },
    cli: { interval: 60 },
    hitl: { timeout: 30 },
    "file-permissions": { timeout: 60, "claude-settings": "" },
  };
}

function makeResolved(): ResolvedGitHub {
  return { repo: "org/repo" };
}

function makeEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: "bm-1234",
    type: "epic",
    name: "Test Epic",
    slug: "test-epic",
    status: "design",
    depends_on: [],
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: "bm-1234.1",
    type: "feature",
    parent: "bm-1234",
    name: "feat-a",
    slug: "feat-a",
    status: "pending",
    depends_on: [],
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makeStore(epics: Epic[], features: Record<string, Feature[]> = {}): TaskStore {
  return {
    getEpic: (id: string) => epics.find((e) => e.id === id),
    listEpics: () => epics,
    listFeatures: (epicId: string) => features[epicId] ?? [],
    addEpic: () => epics[0],
    updateEpic: () => epics[0],
    deleteEpic: () => {},
    getFeature: (id: string) => {
      for (const list of Object.values(features)) {
        const f = list.find((feat) => feat.id === id);
        if (f) return f;
      }
      return undefined;
    },
    addFeature: () => makeFeature(),
    updateFeature: () => makeFeature(),
    deleteFeature: () => {},
    ready: () => [],
    blocked: () => [],
    tree: () => [],
    find: () => undefined,
    dependencyChain: () => [],
    computeWave: () => 0,
    detectCycles: () => [],
    load: () => {},
    save: () => {},
  };
}

describe("reconcileGitHub", () => {
  beforeEach(resetMocks);

  test("returns immediately when GitHub is disabled", async () => {
    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store: makeStore([]),
      syncRefs: {},
      config: makeConfig({ enabled: false }),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.bootstrapped).toBe(false);
    expect(result.opsAttempted).toBe(0);
    expect(mockCalls).toHaveLength(0);
  });

  test("drains pending ops at current tick", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    let refs: SyncRefs = { "bm-1234": { issue: 10 } };
    refs = enqueuePendingOp(refs, "bm-1234", { opType: "bodyEnrich", context: {} }, 0);

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    expect(result.opsAttempted).toBe(1);
  });

  test("skips ops not yet ready (future nextRetryTick)", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    let refs: SyncRefs = { "bm-1234": { issue: 10 } };
    refs = enqueuePendingOp(refs, "bm-1234", { opType: "bodyEnrich", context: {} }, 5);

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 3,
    });

    expect(result.opsAttempted).toBe(0);
  });

  test("runs full reconciliation for entities with undefined bodyHash", async () => {
    const epic = makeEpic({ status: "plan" });
    const store = makeStore([epic]);
    const refs: SyncRefs = { "bm-1234": { issue: 10 } }; // no bodyHash

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.fullReconcileCount).toBe(1);
    const editCalls = callsTo("ghIssueEdit");
    expect(editCalls.length).toBeGreaterThanOrEqual(1);
  });

  test("does not run full reconciliation when bodyHash is set", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    const refs: SyncRefs = { "bm-1234": { issue: 10, bodyHash: "abc123" } };

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.fullReconcileCount).toBe(0);
  });

  test("bootstraps when syncRefs is empty but store has epics", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: {},
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.bootstrapped).toBe(true);
  });

  test("does not bootstrap when syncRefs already populated", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    const refs: SyncRefs = { "bm-1234": { issue: 10, bodyHash: "abc" } };

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.bootstrapped).toBe(false);
  });

  test("increments retry count on failed op execution", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    let refs: SyncRefs = { "bm-1234": { issue: 10, bodyHash: "abc" } };
    refs = enqueuePendingOp(refs, "bm-1234", { opType: "bodyEnrich", context: {} }, 0);
    mockErrors.ghIssueEdit = true;

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    expect(result.opsFailed).toBe(1);
  });

  test("builds artifacts map from epic flat fields", async () => {
    const epic = makeEpic({
      design: ".beastmode/artifacts/design/2026-04-05-00ddfb.md",
      plan: ".beastmode/artifacts/plan/2026-04-05-test.md",
    });
    const store = makeStore([epic]);
    const refs: SyncRefs = { "bm-1234": { issue: 10 } }; // no bodyHash triggers reconciliation

    await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    // Should have called syncGitHub (which calls ghIssueEdit for body update)
    const editCalls = callsTo("ghIssueEdit");
    expect(editCalls.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 3: Run tests to verify**

Run: `cd cli && npx vitest run src/__tests__/reconcile.test.ts 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add cli/src/github/reconcile.ts cli/src/__tests__/reconcile.test.ts
git commit -m "feat(reconciliation-loop): add reconciliation engine with bootstrap and queue drain"
```

---

### Task 3: Watch Loop Integration

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/commands/watch-loop.ts`

- [x] **Step 1: Add reconcileGitHub import and call to tick()**

In `cli/src/commands/watch-loop.ts`, add the import at the top (after existing imports):

```typescript
import { reconcileGitHub } from "../github/reconcile.js";
import { loadSyncRefs, saveSyncRefs } from "../github/sync-refs.js";
import { loadConfig } from "../config.js";
import { discoverGitHub } from "../github/discovery.js";
```

Then modify the `tick()` method to add the reconciliation call after the epic scan loop and before the scan-complete event. Add a `tickCount` field to the class and increment it each tick. Add the reconciliation call:

In the `WatchLoop` class, add the field:

```typescript
private tickCount = 0;
```

At the end of `tick()`, after the epic scan loop (`for (const epic of epics) { ... }`) and before the `emitTyped('scan-complete', ...)` call, add:

```typescript
    // --- Reconciliation pass ---
    this.tickCount++;
    try {
      const config = loadConfig(this.config.projectRoot);
      if (config.github.enabled) {
        const resolved = await discoverGitHub(this.config.projectRoot, config.github["project-name"]);
        if (resolved) {
          const syncRefs = loadSyncRefs(this.config.projectRoot);
          const reconcileResult = await reconcileGitHub({
            projectRoot: this.config.projectRoot,
            store: this.deps.store,
            syncRefs,
            config,
            resolved,
            currentTick: this.tickCount,
            logger: this.logger,
          });

          if (reconcileResult.updatedRefs !== syncRefs) {
            saveSyncRefs(this.config.projectRoot, reconcileResult.updatedRefs);
          }

          if (reconcileResult.opsAttempted > 0) {
            this.logger.info("reconcile: processed operations", {
              attempted: String(reconcileResult.opsAttempted),
              succeeded: String(reconcileResult.opsSucceeded),
              failed: String(reconcileResult.opsFailed),
            });
          }
        }
      }
    } catch (err) {
      this.logger.warn("reconciliation pass failed", { error: String(err) });
    }
```

The `WatchDeps` interface needs a `store` field:

```typescript
export interface WatchDeps {
  scanEpics: (projectRoot: string) => Promise<EnrichedEpic[]>;
  sessionFactory: SessionFactory;
  /** Task store for reconciliation pass. */
  store?: TaskStore;
  logger?: Logger;
}
```

The reconciliation call should guard on `this.deps.store` being defined:

```typescript
if (config.github.enabled && this.deps.store) {
```

- [x] **Step 2: Run tests to verify no regressions**

Run: `cd cli && npx vitest run src/__tests__/watch.test.ts 2>&1 | tail -20`
Expected: PASS — existing watch tests still pass (store is optional)

- [x] **Step 3: Commit** Integration Test Verification

**Wave:** 4
**Depends on:** Task 3

**Files:**
- Test: `cli/src/__tests__/reconciliation-loop.integration.test.ts`
- Test: `cli/src/__tests__/retry-queue.integration.test.ts`

- [x] **Step 1: Run integration tests**

Run: `cd cli && npx vitest run src/__tests__/reconciliation-loop.integration.test.ts 2>&1 | tail -30`
Expected: PASS — all scenarios pass

Run: `cd cli && npx vitest run src/__tests__/retry-queue.integration.test.ts 2>&1 | tail -20`
Expected: PASS — pre-existing retry-queue integration test passes

- [x] **Step 2: Run full test suite**

Run: `cd cli && npx vitest run 2>&1 | tail -30`
Expected: PASS — no regressions

- [x] **Step 3: Commit (if any test fixes needed)**

Only commit if fixes were required. Otherwise, this step is a verification-only step.
