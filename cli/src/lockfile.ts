/**
 * Lockfile manager — prevents duplicate watch instances.
 *
 * Creates .beastmode/.beastmode-watch.lock on start, removes on clean shutdown.
 * Detects stale lockfiles by checking if the PID is still running.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { createLogger, createStdioSink } from "./logger.js";
import type { Logger } from "./logger.js";
import type { LockfileInfo } from "./dispatch/index.js";

const LOCKFILE_NAME = ".beastmode-watch.lock";

function lockfilePath(projectRoot: string): string {
  return resolve(projectRoot, ".beastmode", LOCKFILE_NAME);
}

/** Check if a process with the given PID is still running. */
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Read the lockfile if it exists. Returns null if absent or unparseable. */
export function readLockfile(projectRoot: string): LockfileInfo | null {
  const path = lockfilePath(projectRoot);
  if (!existsSync(path)) return null;

  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as LockfileInfo;
  } catch {
    return null;
  }
}

/**
 * Acquire the watch lock. Returns true if lock was acquired.
 * If a stale lockfile exists (dead PID), removes it and acquires.
 * If an active lockfile exists, returns false.
 */
export function acquireLock(projectRoot: string, logger?: Logger): boolean {
  const log = logger ?? createLogger(createStdioSink(0), {});
  const existing = readLockfile(projectRoot);

  if (existing) {
    if (isProcessRunning(existing.pid)) {
      return false;
    }
    // Stale lockfile — remove it
    log.warn(`Removing stale lockfile (PID ${existing.pid} no longer running)`);
    releaseLock(projectRoot);
  }

  const info: LockfileInfo = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
  };

  writeFileSync(lockfilePath(projectRoot), JSON.stringify(info, null, 2));
  return true;
}

/** Release the watch lock. Safe to call even if no lockfile exists. */
export function releaseLock(projectRoot: string): void {
  const path = lockfilePath(projectRoot);
  try {
    unlinkSync(path);
  } catch {
    // Already gone — fine
  }
}
