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
  bootstrapped: boolean;
  bootstrapCount: number;
  opsAttempted: number;
  opsSucceeded: number;
  opsFailed: number;
  opsPermanentlyFailed: number;
  fullReconcileCount: number;
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
  signal?: AbortSignal;
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
  const { projectRoot, store, config, resolved, currentTick, logger, signal } = opts;
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

  if (signal?.aborted) {
    return { ...result, updatedRefs: refs };
  }

  if (!config.github.enabled) {
    return { ...result, updatedRefs: refs };
  }

  // --- Phase 1: Bootstrap ---
  const hasAnyRefs = Object.keys(refs).length > 0;
  const epics = store.listEpics();

  if (!hasAnyRefs && epics.length > 0) {
    result.bootstrapped = true;
    logger?.debug("reconcile: bootstrapping sync-refs from epic store");

    for (const epic of epics) {
      if (getSyncRef(refs, epic.id)?.issue) continue;
      // Without a known issue number, we can't bootstrap — skip.
      // The next syncGitHub call will create the issue.
      logger?.debug(`reconcile: bootstrap skipping ${epic.slug} — no discoverable issue number`);
    }

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
      const epic = findEpicForEntity(store, entityId);
      if (!epic) {
        logger?.debug(`reconcile: no epic found for entity ${entityId}`);
        continue;
      }

      try {
        if (signal?.aborted) break;
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
    if (signal?.aborted) break;
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
 * Execute a single pending operation by running a full sync pass for its epic.
 */
async function executeOp(
  entityId: string,
  _op: import("./retry-queue.js").PendingOp,
  refs: SyncRefs,
  store: TaskStore,
  config: BeastmodeConfig,
  resolved: ResolvedGitHub,
  opts: { projectRoot: string; logger?: Logger },
): Promise<boolean> {
  const epic = findEpicForEntity(store, entityId);
  if (!epic) return false;

  try {
    const epicInput = buildEpicSyncInput(store, epic);
    const syncResult = await syncGitHub(epicInput, refs, config, resolved, {
      logger: opts.logger,
      projectRoot: opts.projectRoot,
    });

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
  const epic = store.getEpic(entityId);
  if (epic) return epic;

  const feature = store.getFeature(entityId);
  if (feature) return store.getEpic(feature.parent);

  return undefined;
}

/**
 * Build EpicSyncInput from store entities.
 * Maps flat artifact fields to the artifacts Record<string, string[]> format.
 */
function buildEpicSyncInput(store: TaskStore, epic: Epic): EpicSyncInput {
  const features = store.listFeatures(epic.id);

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
    worktreePath: epic.worktree?.path,
  };
}
