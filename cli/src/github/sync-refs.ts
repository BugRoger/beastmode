/**
 * GitHub Sync Refs — I/O for github-sync.json.
 *
 * Stores GitHub issue numbers and body hashes in a dedicated file,
 * separate from the pipeline store. The GitHub sync module is the
 * sole reader/writer of this file.
 *
 * Schema: Record<entityId, { issue: number; bodyHash?: string; pendingOps?: PendingOp[] }>
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { PendingOp } from "./retry-queue.js";

/** A single entity's GitHub sync reference. */
export interface SyncRef {
  issue: number;
  bodyHash?: string;
  pendingOps?: PendingOp[];
}

/** The full sync refs map — keyed by entity ID. */
export type SyncRefs = Record<string, SyncRef>;

const SYNC_FILE = ".beastmode/state/github-sync.json";

/**
 * Load sync refs from disk. Returns empty object if file doesn't exist.
 */
export function loadSyncRefs(projectRoot: string): SyncRefs {
  const filePath = join(projectRoot, SYNC_FILE);
  if (!existsSync(filePath)) return {};

  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as SyncRefs;
  } catch {
    return {};
  }
}

/**
 * Save sync refs to disk. Creates parent directories if needed.
 */
export function saveSyncRefs(projectRoot: string, refs: SyncRefs): void {
  const filePath = join(projectRoot, SYNC_FILE);
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(refs, null, 2) + "\n", "utf-8");
}

/**
 * Get a sync ref for a specific entity. Returns undefined if not found.
 */
export function getSyncRef(refs: SyncRefs, entityId: string): SyncRef | undefined {
  return refs[entityId];
}

/**
 * Set a sync ref for a specific entity. Returns a new refs object (immutable).
 */
export function setSyncRef(refs: SyncRefs, entityId: string, ref: SyncRef): SyncRefs {
  return { ...refs, [entityId]: ref };
}
