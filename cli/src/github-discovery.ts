/**
 * GitHub Discovery — runtime-discovers repo, project, and field metadata.
 *
 * Caches results to `.beastmode/state/github-discovery.cache.json` so
 * the gh CLI calls only happen once. Cache invalidates when the
 * project-name in config changes.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  ghRepoDiscover,
  ghProjectDiscover,
  ghFieldDiscover,
} from "./gh";
import { createLogger } from "./logger.js";
import type { Logger } from "./logger.js";

/** Resolved GitHub metadata — the sync engine's input. */
export interface ResolvedGitHub {
  repo: string;
  projectNumber?: number;
  projectId?: string;
  fieldId?: string;
  fieldOptions?: Record<string, string>;
}

/** Shape of the on-disk cache. */
interface DiscoveryCache extends ResolvedGitHub {
  projectName?: string;
  cachedAt: string;
}

const CACHE_FILENAME = "github-discovery.cache.json";
const FIELD_NAME = "Status";

function cachePath(projectRoot: string): string {
  return resolve(projectRoot, ".beastmode", "state", CACHE_FILENAME);
}

/**
 * Read cached discovery if valid. Returns undefined on cache miss or
 * stale project-name.
 */
function readCache(
  projectRoot: string,
  projectName?: string,
): ResolvedGitHub | undefined {
  const path = cachePath(projectRoot);
  if (!existsSync(path)) return undefined;

  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as DiscoveryCache;
    if (!raw.repo) return undefined;
    // Invalidate if project-name changed
    if (projectName && raw.projectName !== projectName) return undefined;
    return {
      repo: raw.repo,
      projectNumber: raw.projectNumber,
      projectId: raw.projectId,
      fieldId: raw.fieldId,
      fieldOptions: raw.fieldOptions,
    };
  } catch {
    return undefined;
  }
}

/**
 * Write discovery results to cache.
 */
function writeCache(
  projectRoot: string,
  resolved: ResolvedGitHub,
  projectName?: string,
): void {
  const data: DiscoveryCache = {
    ...resolved,
    projectName,
    cachedAt: new Date().toISOString(),
  };
  try {
    writeFileSync(cachePath(projectRoot), JSON.stringify(data, null, 2));
  } catch {
    // Non-fatal — next run will re-discover
  }
}

/**
 * Discover GitHub metadata. Uses cache when valid, otherwise calls gh CLI.
 *
 * Returns undefined only if repo discovery fails (hard requirement).
 * Project/field discovery failures produce a partial result — sync will
 * still work for issues and labels, just skip board updates.
 */
export async function discoverGitHub(
  projectRoot: string,
  projectName?: string,
  logger?: Logger,
): Promise<ResolvedGitHub | undefined> {
  const log = logger ?? createLogger(0, "beastmode");

  // Cache hit?
  const cached = readCache(projectRoot, projectName);
  if (cached) return cached;

  // Discover repo — hard requirement
  const repo = await ghRepoDiscover({ cwd: projectRoot });
  if (!repo) {
    log.warn("GitHub repo discovery failed — is gh authenticated?");
    return undefined;
  }

  const resolved: ResolvedGitHub = { repo };
  const [owner] = repo.split("/");

  // Discover project — optional
  if (projectName) {
    const project = await ghProjectDiscover(owner, projectName, {
      cwd: projectRoot,
    });
    if (project) {
      resolved.projectNumber = project.number;
      resolved.projectId = project.id;

      // Discover field — optional, requires project ID
      const field = await ghFieldDiscover(project.id, FIELD_NAME, {
        cwd: projectRoot,
      });
      if (field) {
        resolved.fieldId = field.fieldId;
        resolved.fieldOptions = field.options;
      }
    }
  }

  writeCache(projectRoot, resolved, projectName);
  return resolved;
}
