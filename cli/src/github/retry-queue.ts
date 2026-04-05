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

  const remaining = entry.pendingOps.filter((p) => p !== op);

  return {
    ...refs,
    [entityId]: {
      ...entry,
      pendingOps: remaining,
    },
  };
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
  const entry = refs[entityId];
  if (!entry?.pendingOps) return refs;

  const newRetryCount = op.retryCount + 1;
  const updatedOp: PendingOp = newRetryCount >= MAX_RETRIES
    ? { ...op, retryCount: newRetryCount, status: "failed" }
    : {
        ...op,
        retryCount: newRetryCount,
        nextRetryTick: computeNextRetryTick(currentTick, newRetryCount),
      };

  const updatedOps = entry.pendingOps.map((p) => (p === op ? updatedOp : p));
  return {
    ...refs,
    [entityId]: {
      ...entry,
      pendingOps: updatedOps,
    },
  };
}

/**
 * Check if an entity has any pending (non-failed) operations.
 */
export function hasPendingOps(refs: SyncRefs, entityId: string): boolean {
  const entry = refs[entityId];
  if (!entry?.pendingOps) return false;
  return entry.pendingOps.some((op) => op.status === "pending");
}
