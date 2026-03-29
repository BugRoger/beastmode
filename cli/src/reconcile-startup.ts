/**
 * Startup reconciliation — adopt live cmux surfaces, clean dead ones.
 *
 * Called by CmuxStrategy during watch loop initialization. Prevents
 * double-dispatching agents that survived a watch loop restart.
 */

import { watch } from "node:fs";
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import type {
  CmuxClientLike,
  CmuxWorkspace,
  DispatchDoneMarker,
} from "./cmux-types.js";
import type { DispatchedSession, SessionResult } from "./watch-types.js";
import { DispatchTracker } from "./dispatch-tracker.js";

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
 * Read and parse a dispatch-done marker file.
 * Returns null if the file doesn't exist or is corrupted.
 */
function readMarker(markerPath: string): SessionResult | null {
  try {
    const marker: DispatchDoneMarker = JSON.parse(
      readFileSync(markerPath, "utf-8"),
    );
    return {
      success: marker.exitCode === 0,
      exitCode: marker.exitCode,
      costUsd: marker.costUsd,
      durationMs: marker.durationMs,
    };
  } catch {
    return null;
  }
}

/**
 * Create a session promise that resolves when the .dispatch-done.json
 * marker file appears in the worktree directory.
 *
 * Uses fs.watch for near-instant detection with a poll fallback.
 */
function watchForMarker(
  worktreePath: string,
  signal: AbortSignal,
): Promise<SessionResult> {
  const markerPath = resolve(worktreePath, ".dispatch-done.json");

  return new Promise<SessionResult>((resolvePromise, reject) => {
    // Check if marker already exists (completed while we were starting up)
    if (existsSync(markerPath)) {
      const result = readMarker(markerPath);
      if (result) {
        resolvePromise(result);
        return;
      }
      // Corrupted marker — fall through to watching
    }

    // Watch for marker file creation
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
      watcher = watch(worktreePath, (_eventType, filename) => {
        if (filename === ".dispatch-done.json") {
          cleanup();
          const result = readMarker(markerPath);
          if (result) {
            resolvePromise(result);
          } else {
            reject(new Error(`Failed to parse marker at ${markerPath}`));
          }
        }
      });
    } catch {
      // fs.watch may fail on some systems — fall back to polling
      const pollInterval = setInterval(() => {
        if (signal.aborted) {
          clearInterval(pollInterval);
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        if (existsSync(markerPath)) {
          clearInterval(pollInterval);
          const result = readMarker(markerPath);
          if (result) {
            resolvePromise(result);
          } else {
            reject(new Error(`Failed to parse marker at ${markerPath}`));
          }
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
 *    - Dead surfaces (no marker) → close via client
 * 4. Empty workspaces after cleanup → remove
 * 5. Non-matching workspaces → leave untouched
 */
export async function reconcileStartup(opts: {
  client: CmuxClientLike;
  tracker: DispatchTracker;
  knownEpicSlugs: string[];
  projectRoot: string;
}): Promise<ReconcileResult> {
  const { client, tracker, knownEpicSlugs, projectRoot } = opts;
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
        // Live surface with parseable title — adopt it
        const worktreeSlug = parsed.featureSlug
          ? `${parsed.epicSlug}-${parsed.featureSlug}`
          : parsed.epicSlug;
        const worktreePath = resolve(
          projectRoot,
          ".claude/worktrees",
          worktreeSlug,
        );

        const abortController = new AbortController();
        const promise = watchForMarker(worktreePath, abortController.signal);

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
          console.warn(
            `[reconcile] Failed to close dead surface ${surface.id} in workspace ${workspace.name}`,
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
        console.warn(
          `[reconcile] Failed to close empty workspace ${workspace.name}`,
        );
      }
    }
  }

  if (
    result.adopted > 0 ||
    result.closedSurfaces > 0 ||
    result.closedWorkspaces > 0
  ) {
    console.log(
      `[reconcile] Startup: adopted ${result.adopted} surface(s), closed ${result.closedSurfaces} dead surface(s), removed ${result.closedWorkspaces} empty workspace(s), skipped ${result.skipped} non-beastmode workspace(s)`,
    );
  }

  return result;
}
