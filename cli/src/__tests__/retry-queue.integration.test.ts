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
