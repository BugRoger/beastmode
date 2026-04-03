/**
 * Startup reconciliation — adopt live cmux surfaces, clean dead ones.
 *
 * Called during watch loop initialization when using cmux dispatch. Prevents
 * double-dispatching agents that survived a watch loop restart.
 */

import { watch } from "node:fs";
import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import type { CmuxClientLike, CmuxWorkspace } from "./cmux-types.js";
import type { DispatchedSession, SessionResult } from "./watch-types.js";
import { DispatchTracker } from "./dispatch-tracker.js";
import { createLogger } from "./logger.js";
import type { Logger } from "./logger.js";
import * as store from "./manifest-store.js";

/** Result of a reconciliation pass. */
export interface ReconcileResult {
  /** Number of live surfaces adopted into the tracker */
  adopted: number;
  /** Number of dead surfaces closed */
  closedSurfaces: number;
  /** Number of empty workspaces removed */
  closedWorkspaces: number;
  /** Number of workspaces skipped (not matching known epics) */
  skipped: number;
}

/**
 * Parse a cmux surface title into epic/phase/feature components.
 *
 * Surface titles follow the convention:
 *   "beastmode <phase> <epic-slug>"
 *   "beastmode implement <epic-slug> <feature-slug>"
 */
export function parseSurfaceTitle(title: string): {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
} | null {
  // Match "beastmode <phase> <epic-slug> [feature-slug]"
  const match = title.match(/^beastmode\s+(\w+)\s+(\S+)(?:\s+(\S+))?$/);
  if (!match) return null;

  const phase = match[1];
  const epicSlug = match[2];
  const featureSlug = match[3];

  return {
    phase,
    epicSlug,
    ...(featureSlug ? { featureSlug } : {}),
  };
}

/**
 * Find and read the most recent output.json in an artifact directory.
 * Returns null if no output.json exists or the file is corrupted.
 */
function findAndReadOutput(artifactDir: string): SessionResult | null {
  try {
    if (!existsSync(artifactDir)) return null;
    const files = readdirSync(artifactDir)
      .filter((f) => f.endsWith(".output.json"))
      .sort();
    if (files.length === 0) return null;
    const filePath = resolve(artifactDir, files[files.length - 1]);
    const output = JSON.parse(readFileSync(filePath, "utf-8"));
    if (!output.status || !output.artifacts) return null;
    return {
      success: output.status === "completed",
      exitCode: output.status === "completed" ? 0 : 1,
      durationMs: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Create a session promise that resolves when an *.output.json file
 * appears in the artifact directory for the given phase.
 *
 * Uses fs.watch for near-instant detection with a poll fallback.
 */
function watchForOutput(
  worktreePath: string,
  phase: string,
  signal: AbortSignal,
): Promise<SessionResult> {
  const artifactDir = resolve(worktreePath, ".beastmode", "artifacts", phase);

  return new Promise<SessionResult>((resolvePromise, reject) => {
    // Check if output already exists
    const existing = findAndReadOutput(artifactDir);
    if (existing) {
      resolvePromise(existing);
      return;
    }

    // Ensure directory exists for watching
    const { mkdirSync } = require("node:fs");
    try { mkdirSync(artifactDir, { recursive: true }); } catch {}

    let watcher: ReturnType<typeof watch> | null = null;

    const cleanup = () => {
      if (watcher) {
        watcher.close();
        watcher = null;
      }
    };

    signal.addEventListener("abort", () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    });

    try {
      watcher = watch(artifactDir, (_eventType, filename) => {
        if (filename && filename.endsWith(".output.json")) {
          cleanup();
          const result = findAndReadOutput(artifactDir);
          if (result) {
            resolvePromise(result);
          } else {
            reject(new Error(`Failed to parse output.json in ${artifactDir}`));
          }
        }
      });
    } catch {
      // fs.watch may fail — fall back to polling
      const pollInterval = setInterval(() => {
        if (signal.aborted) {
          clearInterval(pollInterval);
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        const result = findAndReadOutput(artifactDir);
        if (result) {
          clearInterval(pollInterval);
          resolvePromise(result);
        }
      }, 2000);
    }
  });
}

/**
 * Reconcile cmux state on watch loop startup.
 *
 * 1. List all cmux workspaces
 * 2. Match workspace names to known epic slugs
 * 3. For matching workspaces:
 *    - Live surfaces → adopt into DispatchTracker with fs.watch
 *    - Dead surfaces (no output) → close via client
 * 4. Empty workspaces after cleanup → remove
 * 5. Non-matching workspaces → leave untouched
 */
export async function reconcileStartup(opts: {
  client: CmuxClientLike;
  tracker: DispatchTracker;
  knownEpicSlugs: string[];
  projectRoot: string;
  logger?: Logger;
}): Promise<ReconcileResult> {
  const { client, tracker, knownEpicSlugs, projectRoot } = opts;
  const logger = opts.logger ?? createLogger(0, {});
  const knownSlugs = new Set(knownEpicSlugs);

  const result: ReconcileResult = {
    adopted: 0,
    closedSurfaces: 0,
    closedWorkspaces: 0,
    skipped: 0,
  };

  let workspaces: CmuxWorkspace[];
  try {
    workspaces = await client.listWorkspaces();
  } catch {
    // cmux unavailable — nothing to reconcile
    return result;
  }

  for (const workspace of workspaces) {
    // Check if workspace name matches a known epic slug
    if (!knownSlugs.has(workspace.name)) {
      result.skipped++;
      continue;
    }

    let remainingSurfaces = workspace.surfaces.length;

    for (const surface of workspace.surfaces) {
      const parsed = parseSurfaceTitle(surface.title);

      if (surface.alive && parsed) {
        // Check manifest — if epic is done/cancelled, close instead of adopting
        const manifest = store.load(projectRoot, parsed.epicSlug);
        if (manifest && (manifest.phase === "done" || manifest.phase === "cancelled")) {
          try {
            await client.closeSurface(surface.id);
            result.closedSurfaces++;
            remainingSurfaces--;
          } catch {
            logger.warn(
              `Failed to close orphan surface ${surface.id} for done epic ${parsed.epicSlug}`,
            );
          }
          continue;
        }

        // Live surface with parseable title — adopt it
        const worktreeSlug = parsed.epicSlug;
        const worktreePath = resolve(
          projectRoot,
          ".claude/worktrees",
          worktreeSlug,
        );

        const abortController = new AbortController();
        const promise = watchForOutput(worktreePath, parsed.phase, abortController.signal);

        const session: DispatchedSession = {
          id: `adopted-${surface.id}-${Date.now()}`,
          epicSlug: parsed.epicSlug,
          phase: parsed.phase,
          featureSlug: parsed.featureSlug,
          worktreeSlug,
          abortController,
          promise,
          startedAt: Date.now(),
        };

        tracker.add(session);
        result.adopted++;
      } else if (!surface.alive) {
        // Dead surface — close it
        try {
          await client.closeSurface(surface.id);
          result.closedSurfaces++;
          remainingSurfaces--;
        } catch {
          // Best-effort — log and continue
          logger.warn(
            `Failed to close dead surface ${surface.id} in workspace ${workspace.name}`,
          );
        }
      }
      // Alive but unparseable title — leave it alone (not ours)
    }

    // If workspace is now empty, remove it
    if (remainingSurfaces === 0) {
      try {
        await client.closeWorkspace(workspace.id);
        result.closedWorkspaces++;
      } catch {
        logger.warn(
          `Failed to close empty workspace ${workspace.name}`,
        );
      }
    }
  }

  if (
    result.adopted > 0 ||
    result.closedSurfaces > 0 ||
    result.closedWorkspaces > 0
  ) {
    logger.log(
      `Startup: adopted ${result.adopted} surface(s), closed ${result.closedSurfaces} dead surface(s), removed ${result.closedWorkspaces} empty workspace(s), skipped ${result.skipped} non-beastmode workspace(s)`,
    );
  }

  return result;
}
