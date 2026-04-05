/**
 * Unit tests for retry-queue — backoff calculation and type validation.
 */

import { describe, test, expect } from "vitest";
import type { SyncRefs } from "../github/sync-refs";
import {
  computeNextRetryTick,
  MAX_RETRIES,
  enqueuePendingOp,
  drainPendingOps,
  resolvePendingOp,
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
