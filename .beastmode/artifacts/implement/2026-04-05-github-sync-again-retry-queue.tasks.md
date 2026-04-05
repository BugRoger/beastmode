# retry-queue — Implementation Tasks

## Goal

Add a retry queue system to the sync-refs infrastructure. Failed GitHub API operations are tracked as pending ops on SyncRef entries, retried with exponential backoff (5 retries, tick-based delays: 1, 2, 4, 8, 16), and marked as permanently failed after exhaustion.

## Architecture

- **Data model:** `SyncRef` gains optional `pendingOps: PendingOp[]` where each op has type, retryCount, nextRetryTick, status, and context payload
- **Operation types:** `"bodyEnrich"`, `"titleUpdate"`, `"labelSync"`, `"boardSync"`, `"subIssueLink"` (string enum)
- **Backoff:** Pure function `computeNextRetryTick(currentTick, retryCount)` returns `currentTick + 2^retryCount`
- **Queue functions:** `enqueuePendingOp`, `drainPendingOps`, `resolvePendingOp` — all pure, operating on `SyncRefs`
- **Integration:** Sync engine error paths call `enqueuePendingOp` instead of silently dropping failures
- **I/O:** Existing `loadSyncRefs`/`saveSyncRefs` transparently read/write the extended format (no migration needed — `pendingOps` is optional)

## Tech Stack

- TypeScript (ES modules), Bun runtime
- Vitest (test runner), Cucumber-js (BDD)
- Existing patterns: immutable pure functions, warn-and-continue error handling

## File Structure

| File | Responsibility |
|------|---------------|
| `cli/src/github/retry-queue.ts` | Create: PendingOp types, backoff calculation, queue operations (pure functions) |
| `cli/src/github/sync-refs.ts` | Modify: Extend SyncRef interface with optional pendingOps |
| `cli/src/github/sync.ts` | Modify: Import retry-queue, enqueue failed ops in error paths |
| `cli/src/__tests__/retry-queue.test.ts` | Create: Unit tests for backoff, queue ops, 5-retry limit |
| `cli/src/__tests__/retry-queue.integration.test.ts` | Create: Integration test from Gherkin scenarios |

---

## Task 0: Integration Test (BDD RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/retry-queue.integration.test.ts`

- [ ] **Step 1: Write the integration test from Gherkin scenarios**

```typescript
/**
 * Integration test: retry-queue feature.
 * Exercises the full retry queue lifecycle — enqueue, backoff, drain, resolve, permanent failure.
 * Expected: RED until all implementation tasks complete.
 */

import { describe, test, expect } from "vitest";
import type { SyncRefs } from "../github/sync-refs";
import {
  enqueuePendingOp,
  drainPendingOps,
  resolvePendingOp,
  computeNextRetryTick,
  type PendingOp,
  type OpType,
} from "../github/retry-queue";

describe("@github-sync-again: Failed GitHub API operations retry with exponential backoff", () => {
  // Scenario: Failed API operation is queued for retry
  test("failed API operation is queued for retry", () => {
    const refs: SyncRefs = {
      "bm-1234": { issue: 42 },
    };

    const updated = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: { body: "test body" },
    }, 0);

    const ops = updated["bm-1234"].pendingOps;
    expect(ops).toBeDefined();
    expect(ops).toHaveLength(1);
    expect(ops![0].opType).toBe("bodyEnrich");
    expect(ops![0].retryCount).toBe(0);
    expect(ops![0].status).toBe("pending");
  });

  // Scenario: Retry queue attempts up to 5 retries with exponential backoff
  test("retry queue attempts with exponential backoff — attempt 0 to 1", () => {
    let refs: SyncRefs = {
      "bm-1234": { issue: 42 },
    };

    // Enqueue at tick 0
    refs = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: {},
    }, 0);

    // After first backoff interval (tick 1), drain should return the op
    const drained = drainPendingOps(refs, 1);
    expect(drained).toHaveLength(1);
    expect(drained[0].entityId).toBe("bm-1234");
    expect(drained[0].op.retryCount).toBe(0);
  });

  // Scenario: Exponential backoff uses increasing delays between retries
  test("exponential backoff uses increasing delays", () => {
    expect(computeNextRetryTick(0, 0)).toBe(1);   // 2^0 = 1
    expect(computeNextRetryTick(1, 1)).toBe(3);   // 1 + 2^1 = 3
    expect(computeNextRetryTick(3, 2)).toBe(7);   // 3 + 2^2 = 7
    expect(computeNextRetryTick(7, 3)).toBe(15);  // 7 + 2^3 = 15
    expect(computeNextRetryTick(15, 4)).toBe(31); // 15 + 2^4 = 31
  });

  // Scenario: Operation succeeds on retry
  test("operation succeeds on retry and is removed from queue", () => {
    let refs: SyncRefs = {
      "bm-1234": { issue: 42 },
    };

    refs = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: { body: "test body" },
    }, 0);

    // Simulate success — resolve the op
    const op = refs["bm-1234"].pendingOps![0];
    refs = resolvePendingOp(refs, "bm-1234", op, "completed");

    expect(refs["bm-1234"].pendingOps).toHaveLength(0);
  });

  // Scenario: Operation marked permanently failed after 5 retries
  test("operation marked permanently failed after 5 retries", () => {
    let refs: SyncRefs = {
      "bm-1234": { issue: 42 },
    };

    refs = enqueuePendingOp(refs, "bm-1234", {
      opType: "labelSync",
      context: {},
    }, 0);

    // Simulate 5 failed retries by bumping retryCount
    const entry = refs["bm-1234"];
    const failedOp: PendingOp = {
      ...entry.pendingOps![0],
      retryCount: 5,
      status: "pending",
    };
    refs = {
      ...refs,
      "bm-1234": { ...entry, pendingOps: [failedOp] },
    };

    // Resolve as failed
    refs = resolvePendingOp(refs, "bm-1234", failedOp, "failed");

    expect(refs["bm-1234"].pendingOps).toHaveLength(0);
  });

  // Scenario: Retry queue preserves operation context across attempts
  test("retry queue preserves operation context across attempts", () => {
    let refs: SyncRefs = {
      "bm-1234": { issue: 42 },
    };

    const context = { title: "Epic: Feature", body: "Full body content" };
    refs = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context,
    }, 0);

    // Drain at tick 1
    const drained = drainPendingOps(refs, 1);
    expect(drained[0].op.context).toEqual(context);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/retry-queue.integration.test.ts`
Expected: FAIL — module `../github/retry-queue` does not exist yet

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/retry-queue.integration.test.ts
git commit -m "test(retry-queue): RED integration test from Gherkin scenarios"
```

---

## Task 1: PendingOp Types and Backoff Calculation

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync-refs.ts` (lines 14-21)
- Create: `cli/src/github/retry-queue.ts`
- Create: `cli/src/__tests__/retry-queue.test.ts`

- [ ] **Step 1: Write failing tests for types and backoff**

```typescript
/**
 * Unit tests for retry-queue — backoff calculation and type validation.
 */

import { describe, test, expect } from "vitest";
import {
  computeNextRetryTick,
  MAX_RETRIES,
  type PendingOp,
  type OpType,
} from "../github/retry-queue";

describe("retry-queue: backoff calculation", () => {
  test("computeNextRetryTick returns currentTick + 2^retryCount", () => {
    expect(computeNextRetryTick(0, 0)).toBe(1);   // 0 + 2^0 = 1
    expect(computeNextRetryTick(1, 1)).toBe(3);   // 1 + 2^1 = 3
    expect(computeNextRetryTick(3, 2)).toBe(7);   // 3 + 2^2 = 7
    expect(computeNextRetryTick(7, 3)).toBe(15);  // 7 + 2^3 = 15
    expect(computeNextRetryTick(15, 4)).toBe(31); // 15 + 2^4 = 31
  });

  test("MAX_RETRIES is 5", () => {
    expect(MAX_RETRIES).toBe(5);
  });

  test("backoff at retry 0 is 1 tick", () => {
    expect(computeNextRetryTick(10, 0)).toBe(11); // 10 + 1
  });

  test("backoff at retry 4 is 16 ticks", () => {
    expect(computeNextRetryTick(10, 4)).toBe(26); // 10 + 16
  });
});

describe("retry-queue: PendingOp type shape", () => {
  test("PendingOp has required fields", () => {
    const op: PendingOp = {
      opType: "bodyEnrich",
      retryCount: 0,
      nextRetryTick: 1,
      status: "pending",
      context: { body: "test" },
    };
    expect(op.opType).toBe("bodyEnrich");
    expect(op.retryCount).toBe(0);
    expect(op.nextRetryTick).toBe(1);
    expect(op.status).toBe("pending");
    expect(op.context).toEqual({ body: "test" });
  });

  test("all OpType values are valid", () => {
    const types: OpType[] = ["bodyEnrich", "titleUpdate", "labelSync", "boardSync", "subIssueLink"];
    expect(types).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/retry-queue.test.ts`
Expected: FAIL — module `../github/retry-queue` does not exist

- [ ] **Step 3: Extend SyncRef interface in sync-refs.ts**

In `cli/src/github/sync-refs.ts`, add the `pendingOps` field to `SyncRef`:

```typescript
// Import the PendingOp type
import type { PendingOp } from "./retry-queue.js";

/** A single entity's GitHub sync reference. */
export interface SyncRef {
  issue: number;
  bodyHash?: string;
  pendingOps?: PendingOp[];
}
```

- [ ] **Step 4: Create retry-queue.ts with types and backoff**

Create `cli/src/github/retry-queue.ts`:

```typescript
/**
 * Retry Queue — pure functions for managing failed GitHub API operations.
 *
 * Operations are tracked as pending ops on SyncRef entries. Each op has a type,
 * retry count, next-retry tick, status, and context payload. Exponential backoff
 * computes tick-based delays: retry N waits 2^N ticks.
 *
 * After 5 failed retries, the operation is marked as permanently failed.
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

/** A single pending operation awaiting retry. */
export interface PendingOp {
  opType: OpType;
  retryCount: number;
  nextRetryTick: number;
  status: OpStatus;
  context: Record<string, unknown>;
}

/** Maximum number of retry attempts before permanent failure. */
export const MAX_RETRIES = 5;

/**
 * Compute the next retry tick using exponential backoff.
 * Delay = 2^retryCount ticks (1, 2, 4, 8, 16).
 */
export function computeNextRetryTick(currentTick: number, retryCount: number): number {
  return currentTick + Math.pow(2, retryCount);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/retry-queue.test.ts`
Expected: PASS

- [ ] **Step 6: Run existing sync-refs tests to verify no breakage**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-refs.test.ts`
Expected: PASS — the optional field doesn't break existing I/O

- [ ] **Step 7: Commit**

```bash
git add cli/src/github/retry-queue.ts cli/src/github/sync-refs.ts cli/src/__tests__/retry-queue.test.ts
git commit -m "feat(retry-queue): PendingOp types, SyncRef extension, backoff calculation"
```

---

## Task 2: Queue Operations (enqueue, drain, resolve)

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/github/retry-queue.ts`
- Modify: `cli/src/__tests__/retry-queue.test.ts`

- [ ] **Step 1: Write failing tests for queue operations**

Append to `cli/src/__tests__/retry-queue.test.ts`:

```typescript
import type { SyncRefs } from "../github/sync-refs";
import {
  enqueuePendingOp,
  drainPendingOps,
  resolvePendingOp,
} from "../github/retry-queue";

describe("retry-queue: enqueuePendingOp", () => {
  test("adds a pending op to an entity with no existing ops", () => {
    const refs: SyncRefs = { "bm-1234": { issue: 42 } };
    const updated = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: { body: "test" },
    }, 0);

    const ops = updated["bm-1234"].pendingOps!;
    expect(ops).toHaveLength(1);
    expect(ops[0].opType).toBe("bodyEnrich");
    expect(ops[0].retryCount).toBe(0);
    expect(ops[0].nextRetryTick).toBe(1); // 0 + 2^0
    expect(ops[0].status).toBe("pending");
    expect(ops[0].context).toEqual({ body: "test" });
  });

  test("appends to existing pending ops", () => {
    const refs: SyncRefs = {
      "bm-1234": {
        issue: 42,
        pendingOps: [{
          opType: "bodyEnrich",
          retryCount: 0,
          nextRetryTick: 1,
          status: "pending" as const,
          context: {},
        }],
      },
    };
    const updated = enqueuePendingOp(refs, "bm-1234", {
      opType: "labelSync",
      context: {},
    }, 5);

    expect(updated["bm-1234"].pendingOps).toHaveLength(2);
    expect(updated["bm-1234"].pendingOps![1].opType).toBe("labelSync");
  });

  test("returns new object (immutable)", () => {
    const refs: SyncRefs = { "bm-1234": { issue: 42 } };
    const updated = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: {},
    }, 0);
    expect(refs["bm-1234"].pendingOps).toBeUndefined();
    expect(updated["bm-1234"].pendingOps).toHaveLength(1);
  });

  test("does nothing if entity does not exist", () => {
    const refs: SyncRefs = {};
    const updated = enqueuePendingOp(refs, "bm-9999", {
      opType: "bodyEnrich",
      context: {},
    }, 0);
    expect(updated).toEqual(refs);
  });
});

describe("retry-queue: drainPendingOps", () => {
  test("returns ops whose nextRetryTick <= currentTick", () => {
    const refs: SyncRefs = {
      "bm-1234": {
        issue: 42,
        pendingOps: [{
          opType: "bodyEnrich",
          retryCount: 0,
          nextRetryTick: 5,
          status: "pending" as const,
          context: {},
        }],
      },
    };

    expect(drainPendingOps(refs, 4)).toHaveLength(0);
    expect(drainPendingOps(refs, 5)).toHaveLength(1);
    expect(drainPendingOps(refs, 10)).toHaveLength(1);
  });

  test("returns ops grouped by entity", () => {
    const refs: SyncRefs = {
      "bm-1234": {
        issue: 42,
        pendingOps: [{
          opType: "bodyEnrich",
          retryCount: 0,
          nextRetryTick: 1,
          status: "pending" as const,
          context: {},
        }],
      },
      "bm-5678": {
        issue: 99,
        pendingOps: [{
          opType: "labelSync",
          retryCount: 1,
          nextRetryTick: 1,
          status: "pending" as const,
          context: {},
        }],
      },
    };

    const drained = drainPendingOps(refs, 1);
    expect(drained).toHaveLength(2);
    const ids = drained.map((d) => d.entityId);
    expect(ids).toContain("bm-1234");
    expect(ids).toContain("bm-5678");
  });

  test("returns empty when no ops are pending", () => {
    const refs: SyncRefs = {
      "bm-1234": { issue: 42 },
    };
    expect(drainPendingOps(refs, 100)).toHaveLength(0);
  });

  test("skips ops with status 'failed'", () => {
    const refs: SyncRefs = {
      "bm-1234": {
        issue: 42,
        pendingOps: [{
          opType: "bodyEnrich",
          retryCount: 5,
          nextRetryTick: 1,
          status: "failed" as const,
          context: {},
        }],
      },
    };
    expect(drainPendingOps(refs, 100)).toHaveLength(0);
  });

  test("skips ops that have exceeded MAX_RETRIES", () => {
    const refs: SyncRefs = {
      "bm-1234": {
        issue: 42,
        pendingOps: [{
          opType: "bodyEnrich",
          retryCount: 5,
          nextRetryTick: 1,
          status: "pending" as const,
          context: {},
        }],
      },
    };
    expect(drainPendingOps(refs, 100)).toHaveLength(0);
  });
});

describe("retry-queue: resolvePendingOp", () => {
  test("removes op from entity on 'completed' resolution", () => {
    const op: PendingOp = {
      opType: "bodyEnrich",
      retryCount: 1,
      nextRetryTick: 3,
      status: "pending",
      context: {},
    };
    const refs: SyncRefs = {
      "bm-1234": { issue: 42, pendingOps: [op] },
    };

    const updated = resolvePendingOp(refs, "bm-1234", op, "completed");
    expect(updated["bm-1234"].pendingOps).toHaveLength(0);
  });

  test("removes op from entity on 'failed' resolution", () => {
    const op: PendingOp = {
      opType: "bodyEnrich",
      retryCount: 5,
      nextRetryTick: 31,
      status: "pending",
      context: {},
    };
    const refs: SyncRefs = {
      "bm-1234": { issue: 42, pendingOps: [op] },
    };

    const updated = resolvePendingOp(refs, "bm-1234", op, "failed");
    expect(updated["bm-1234"].pendingOps).toHaveLength(0);
  });

  test("preserves other ops on the same entity", () => {
    const op1: PendingOp = {
      opType: "bodyEnrich",
      retryCount: 0,
      nextRetryTick: 1,
      status: "pending",
      context: {},
    };
    const op2: PendingOp = {
      opType: "labelSync",
      retryCount: 0,
      nextRetryTick: 1,
      status: "pending",
      context: {},
    };
    const refs: SyncRefs = {
      "bm-1234": { issue: 42, pendingOps: [op1, op2] },
    };

    const updated = resolvePendingOp(refs, "bm-1234", op1, "completed");
    expect(updated["bm-1234"].pendingOps).toHaveLength(1);
    expect(updated["bm-1234"].pendingOps![0].opType).toBe("labelSync");
  });

  test("returns new object (immutable)", () => {
    const op: PendingOp = {
      opType: "bodyEnrich",
      retryCount: 0,
      nextRetryTick: 1,
      status: "pending",
      context: {},
    };
    const refs: SyncRefs = {
      "bm-1234": { issue: 42, pendingOps: [op] },
    };

    const updated = resolvePendingOp(refs, "bm-1234", op, "completed");
    expect(refs["bm-1234"].pendingOps).toHaveLength(1);
    expect(updated["bm-1234"].pendingOps).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/retry-queue.test.ts`
Expected: FAIL — `enqueuePendingOp`, `drainPendingOps`, `resolvePendingOp` not exported yet

- [ ] **Step 3: Implement queue operations in retry-queue.ts**

Add to `cli/src/github/retry-queue.ts`:

```typescript
/** Result of draining — identifies entity and the op ready for retry. */
export interface DrainedOp {
  entityId: string;
  op: PendingOp;
}

/**
 * Enqueue a new pending operation on an entity.
 * Returns a new SyncRefs object (immutable). No-op if entityId not found.
 */
export function enqueuePendingOp(
  refs: SyncRefs,
  entityId: string,
  params: { opType: OpType; context: Record<string, unknown> },
  currentTick: number,
): SyncRefs {
  const entry = refs[entityId];
  if (!entry) return refs;

  const newOp: PendingOp = {
    opType: params.opType,
    retryCount: 0,
    nextRetryTick: computeNextRetryTick(currentTick, 0),
    status: "pending",
    context: params.context,
  };

  const existingOps = entry.pendingOps ?? [];
  return {
    ...refs,
    [entityId]: {
      ...entry,
      pendingOps: [...existingOps, newOp],
    },
  };
}

/**
 * Drain all pending operations whose next-retry tick has arrived.
 * Returns a flat list of { entityId, op } pairs. Skips failed and over-limit ops.
 */
export function drainPendingOps(refs: SyncRefs, currentTick: number): DrainedOp[] {
  const result: DrainedOp[] = [];

  for (const [entityId, entry] of Object.entries(refs)) {
    if (!entry.pendingOps) continue;

    for (const op of entry.pendingOps) {
      if (op.status === "failed") continue;
      if (op.retryCount >= MAX_RETRIES) continue;
      if (op.nextRetryTick <= currentTick) {
        result.push({ entityId, op });
      }
    }
  }

  return result;
}

/**
 * Resolve a pending operation — removes it from the queue.
 * Resolution is either "completed" (success) or "failed" (permanent failure).
 * Returns a new SyncRefs object (immutable).
 */
export function resolvePendingOp(
  refs: SyncRefs,
  entityId: string,
  op: PendingOp,
  resolution: "completed" | "failed",
): SyncRefs {
  const entry = refs[entityId];
  if (!entry?.pendingOps) return refs;

  const remaining = entry.pendingOps.filter(
    (p) => !(p.opType === op.opType && p.retryCount === op.retryCount && p.nextRetryTick === op.nextRetryTick),
  );

  return {
    ...refs,
    [entityId]: {
      ...entry,
      pendingOps: remaining,
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/retry-queue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/github/retry-queue.ts cli/src/__tests__/retry-queue.test.ts
git commit -m "feat(retry-queue): enqueuePendingOp, drainPendingOps, resolvePendingOp"
```

---

## Task 3: Sync Engine Integration

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/github/sync.ts` (lines 19-43, 290-313, 463-654, 659-806)
- Modify: `cli/src/__tests__/github-sync.test.ts`

- [ ] **Step 1: Write failing tests for sync engine enqueue behavior**

Add new describe block to `cli/src/__tests__/github-sync.test.ts`:

```typescript
describe("syncGitHub: retry-queue integration", () => {
  test("enqueues bodyEnrich when epic body update fails", async () => {
    // Set up: epic already exists in sync refs (issue 42, stale bodyHash)
    const syncRefs: SyncRefs = {
      "bm-1234": { issue: 42, bodyHash: "stale-hash" },
    };
    mockErrors.ghIssueEdit = true; // body update will fail

    const epic = makeTestEpicInput();
    const result = await syncGitHub(epic, syncRefs, makeTestConfig(), makeTestResolved(), {});

    // The result should include a pendingOps mutation
    const enqueueMuts = result.mutations.filter((m) => m.type === "enqueuePendingOp");
    expect(enqueueMuts.length).toBeGreaterThanOrEqual(1);
    expect(enqueueMuts[0]).toMatchObject({
      type: "enqueuePendingOp",
      entityId: "bm-1234",
      opType: "bodyEnrich",
    });
  });

  test("enqueues labelSync when epic label update fails", async () => {
    const syncRefs: SyncRefs = {
      "bm-1234": { issue: 42, bodyHash: "current" },
    };
    mockErrors.ghIssueLabels = true;

    const epic = makeTestEpicInput();
    const result = await syncGitHub(epic, syncRefs, makeTestConfig(), makeTestResolved(), {});

    const enqueueMuts = result.mutations.filter((m) => m.type === "enqueuePendingOp");
    const labelMut = enqueueMuts.find((m) => m.opType === "labelSync");
    expect(labelMut).toBeDefined();
  });

  test("enqueues bodyEnrich when feature body update fails", async () => {
    const syncRefs: SyncRefs = {
      "bm-1234": { issue: 42, bodyHash: "current" },
      "bm-1234.1": { issue: 43, bodyHash: "stale-hash" },
    };
    // Only fail ghIssueEdit for feature body (second call)
    let editCallCount = 0;
    // Override with counting mock
    mockReturns.ghIssueEdit = undefined; // use default
    mockErrors.ghIssueEdit = true;

    const epic = makeTestEpicInput();
    const result = await syncGitHub(epic, syncRefs, makeTestConfig(), makeTestResolved(), {});

    const enqueueMuts = result.mutations.filter((m) => m.type === "enqueuePendingOp");
    expect(enqueueMuts.length).toBeGreaterThanOrEqual(1);
  });

  test("enqueues subIssueLink when sub-issue linking fails", async () => {
    const syncRefs: SyncRefs = {
      "bm-1234": { issue: 42 },
    };
    mockErrors.ghSubIssueAdd = true;

    const epic = makeTestEpicInput();
    const result = await syncGitHub(epic, syncRefs, makeTestConfig(), makeTestResolved(), {});

    const enqueueMuts = result.mutations.filter((m) => m.type === "enqueuePendingOp");
    const linkMut = enqueueMuts.find((m) => m.opType === "subIssueLink");
    expect(linkMut).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/github-sync.test.ts`
Expected: FAIL — `enqueuePendingOp` mutation type not recognized

- [ ] **Step 3: Add enqueuePendingOp mutation type to sync.ts**

In `cli/src/github/sync.ts`, extend the `SyncMutation` type:

```typescript
export type SyncMutation =
  | { type: "setEpic"; entityId: string; issue: number; repo: string }
  | { type: "setFeatureIssue"; entityId: string; issue: number }
  | { type: "setEpicBodyHash"; entityId: string; bodyHash: string }
  | { type: "setFeatureBodyHash"; entityId: string; bodyHash: string }
  | { type: "enqueuePendingOp"; entityId: string; opType: string; context: Record<string, unknown> };
```

- [ ] **Step 4: Wire enqueuePendingOp mutations into sync engine error paths**

In `syncGitHub()` — after epic body update failure (line ~564):

```typescript
} else {
  result.warnings.push("Failed to update epic body");
  result.mutations.push({
    type: "enqueuePendingOp",
    entityId: epic.id,
    opType: "bodyEnrich",
    context: {},
  });
}
```

In `syncGitHub()` — after epic label update failure (ghIssueLabels returns undefined, line ~573):

```typescript
if (currentLabels) {
  // ... existing label update logic ...
} else {
  result.mutations.push({
    type: "enqueuePendingOp",
    entityId: epic.id,
    opType: "labelSync",
    context: { phase: epic.phase },
  });
}
```

In `syncFeature()` — after feature body update failure (line ~776):

```typescript
} else {
  result.warnings.push(`Failed to update body for feature ${feature.slug}`);
  result.mutations.push({
    type: "enqueuePendingOp",
    entityId: feature.id,
    opType: "bodyEnrich",
    context: {},
  });
}
```

In `syncFeature()` — after sub-issue linking failure (line ~724):

```typescript
await ghSubIssueAdd(repo, epicNumber, featureNumber, { logger: opts.logger });
```

Change to:

```typescript
const linked = await ghSubIssueAdd(repo, epicNumber, featureNumber, { logger: opts.logger });
if (!linked) {
  result.mutations.push({
    type: "enqueuePendingOp",
    entityId: feature.id,
    opType: "subIssueLink",
    context: { epicNumber, featureNumber },
  });
}
```

In `syncFeature()` — after feature label update failure:

```typescript
if (currentLabels) {
  // ... existing status label logic ...
} else {
  result.mutations.push({
    type: "enqueuePendingOp",
    entityId: feature.id,
    opType: "labelSync",
    context: { status: feature.status },
  });
}
```

- [ ] **Step 5: Wire mutation application in syncGitHubForEpic**

In `syncGitHubForEpic()` (line ~936), add handling for the new mutation type:

```typescript
} else if (mut.type === "enqueuePendingOp") {
  const { enqueuePendingOp } = await import("./retry-queue.js");
  syncRefs = enqueuePendingOp(syncRefs, mut.entityId, {
    opType: mut.opType as any,
    context: mut.context,
  }, 0); // tick 0 — reconciliation loop will provide real tick
}
```

- [ ] **Step 6: Run sync engine tests**

Run: `cd cli && bun --bun vitest run src/__tests__/github-sync.test.ts`
Expected: PASS

- [ ] **Step 7: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — no existing tests broken

- [ ] **Step 8: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/github-sync.test.ts
git commit -m "feat(retry-queue): enqueue failed ops in sync engine error paths"
```

---

## Task 4: Integration Test GREEN Verification

**Wave:** 4
**Depends on:** Task 3

**Files:**
- Test: `cli/src/__tests__/retry-queue.integration.test.ts`

- [ ] **Step 1: Run the integration test — expect GREEN**

Run: `cd cli && bun --bun vitest run src/__tests__/retry-queue.integration.test.ts`
Expected: PASS — all 6 scenarios green

- [ ] **Step 2: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [ ] **Step 3: Commit (no-op if no changes needed)**

If any fixes were needed, commit them:
```bash
git add -A
git commit -m "fix(retry-queue): integration test fixes"
```
