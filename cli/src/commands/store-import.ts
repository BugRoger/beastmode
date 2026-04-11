/**
 * Store Import — migrates .manifest.json files into the structured task store.
 *
 * Self-contained: inlines all manifest-reading code.
 * Idempotent: existing entities matched by slug are skipped.
 * Cleanup: deletes .manifest.json files on success.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
} from "fs";
import { resolve, dirname } from "path";
import type { JsonFileStore } from "../store/json-file-store.js";
import type { Epic, Feature, EpicStatus, FeatureStatus } from "../store/types.js";

// --- Inlined raw file types ---

interface RawFeatureEntry {
  slug: string;
  plan: string;
  description?: string;
  wave?: number;
  status: "pending" | "in-progress" | "completed" | "blocked";
  reDispatchCount?: number;
  github?: { issue: number; bodyHash?: string };
}

interface RawGitHubEntry {
  epic: number;
  repo: string;
  bodyHash?: string;
}

interface RawEpicFile {
  slug: string;
  epic?: string;
  phase: string;
  features: RawFeatureEntry[];
  artifacts: Record<string, string[]>;
  summary?: { problem: string; solution: string };
  worktree?: { branch: string; path: string };
  github?: RawGitHubEntry;
  blocked?: { gate: string; reason: string } | null;
  originId?: string;
  lastUpdated: string;
}

// --- GitHub sync file types ---

interface GitHubSyncEntry {
  issue: number;
  bodyHash?: string;
}

type GitHubSyncFile = Record<string, GitHubSyncEntry>;

// --- Inlined validation ---

const VALID_PHASES = new Set([
  "design",
  "plan",
  "implement",
  "validate",
  "release",
  "done",
  "cancelled",
]);

const VALID_FEATURE_STATUSES = new Set([
  "pending",
  "in-progress",
  "completed",
  "blocked",
]);

function isValidManifest(data: unknown): data is RawEpicFile {
  if (data === null || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.slug !== "string") return false;
  if (typeof obj.phase !== "string" || !VALID_PHASES.has(obj.phase))
    return false;
  if (typeof obj.lastUpdated !== "string") return false;
  if (!Array.isArray(obj.features)) return false;

  for (const f of obj.features) {
    if (f === null || typeof f !== "object") return false;
    const feat = f as Record<string, unknown>;
    if (typeof feat.slug !== "string") return false;
    if (typeof feat.status !== "string") return false;
    if (!VALID_FEATURE_STATUSES.has(feat.status)) return false;
  }

  return true;
}

// --- Inlined manifest discovery ---

function discoverManifests(
  projectRoot: string,
): { path: string; manifest: RawEpicFile }[] {
  const dir = resolve(projectRoot, ".beastmode", "state");
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".manifest.json"))
    .sort();

  // Deduplicate by slug — keep latest (files sorted chronologically by date prefix)
  const bySlug = new Map<string, { path: string; manifest: RawEpicFile }>();

  for (const file of files) {
    try {
      const fullPath = resolve(dir, file);
      const raw = readFileSync(fullPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (isValidManifest(parsed)) {
        bySlug.set(parsed.slug, { path: fullPath, manifest: parsed });
      }
    } catch {
      // Skip invalid/corrupt
    }
  }

  return Array.from(bySlug.values());
}

// --- Import result types ---

export interface ImportResult {
  epics: Epic[];
  features: Feature[];
  skipped: string[];
  deleted: string[];
  validation: {
    valid: boolean;
    orphanFeatures: string[];
    unresolvedDeps: string[];
  };
}

// --- GitHub sync persistence ---

function loadGitHubSync(projectRoot: string): GitHubSyncFile {
  const syncPath = resolve(projectRoot, ".beastmode", "state", "github-sync.json");
  if (!existsSync(syncPath)) return {};
  try {
    return JSON.parse(readFileSync(syncPath, "utf-8"));
  } catch {
    return {};
  }
}

function saveGitHubSync(projectRoot: string, sync: GitHubSyncFile): void {
  const syncPath = resolve(projectRoot, ".beastmode", "state", "github-sync.json");
  const dir = dirname(syncPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(syncPath, JSON.stringify(sync, null, 2) + "\n", "utf-8");
}

// --- Core import logic ---

export async function importTestable(
  store: JsonFileStore,
  projectRoot: string,
): Promise<ImportResult> {
  const discovered = discoverManifests(projectRoot);
  const result: ImportResult = {
    epics: [],
    features: [],
    skipped: [],
    deleted: [],
    validation: { valid: true, orphanFeatures: [], unresolvedDeps: [] },
  };

  const githubSync = loadGitHubSync(projectRoot);

  await store.transact((s) => {
    for (const { path, manifest } of discovered) {
      // Idempotency: skip if epic with this name already exists
      // (epic slugs are now derived as slugify(name) + "-" + hex, so we search by name)
      const epicName = manifest.epic || manifest.slug;
      const existing = s.listEpics().find((e) => e.name === epicName);
      if (existing) {
        result.skipped.push(manifest.slug);
        continue;
      }

      // --- Create Epic ---
      const epic = s.addEpic({ name: epicName, slug: manifest.slug });

      // Update epic fields
      const epicPatch: Record<string, unknown> = {
        status: manifest.phase as EpicStatus,
      };

      if (manifest.summary) {
        epicPatch.summary = manifest.summary.problem;
      }

      if (manifest.worktree) {
        epicPatch.worktree = manifest.worktree;
      }

      // Map artifacts to typed phase fields (first entry per phase)
      if (manifest.artifacts) {
        for (const phase of [
          "design",
          "plan",
          "implement",
          "validate",
          "release",
        ]) {
          const paths = manifest.artifacts[phase];
          if (paths && paths.length > 0) {
            epicPatch[phase] = paths[0];
          }
        }
      }

      s.updateEpic(epic.id, epicPatch as any);
      const updatedEpic = s.getEpic(epic.id)!;
      result.epics.push(updatedEpic);

      // --- Extract GitHub refs ---
      if (manifest.github) {
        githubSync[epic.id] = {
          issue: manifest.github.epic,
          ...(manifest.github.bodyHash
            ? { bodyHash: manifest.github.bodyHash }
            : {}),
        };
      }

      // --- Create Features ---
      const waveGroups = new Map<number, Feature[]>();
      const createdFeatures: Feature[] = [];

      for (const mf of manifest.features) {
        const feature = s.addFeature({
          parent: epic.id,
          name: mf.slug,
          slug: mf.slug,
          description: mf.description,
        });

        // Update feature fields
        const featurePatch: Record<string, unknown> = {
          status: mf.status as FeatureStatus,
        };
        if (mf.plan) {
          featurePatch.plan = mf.plan;
        }
        s.updateFeature(feature.id, featurePatch as any);

        const updatedFeature = s.getFeature(feature.id)!;
        createdFeatures.push(updatedFeature);

        // Track wave grouping
        const wave = mf.wave ?? 1;
        if (!waveGroups.has(wave)) waveGroups.set(wave, []);
        waveGroups.get(wave)!.push(updatedFeature);

        // Extract feature GitHub refs
        if (mf.github) {
          githubSync[feature.id] = {
            issue: mf.github.issue,
            ...(mf.github.bodyHash
              ? { bodyHash: mf.github.bodyHash }
              : {}),
          };
        }
      }

      // --- Wave-to-dependency conversion ---
      const waves = Array.from(waveGroups.keys()).sort((a, b) => a - b);
      for (let i = 1; i < waves.length; i++) {
        const prevWaveFeatures = waveGroups.get(waves[i - 1])!;
        const currWaveFeatures = waveGroups.get(waves[i])!;
        const prevIds = prevWaveFeatures.map((f) => f.id);

        for (const feature of currWaveFeatures) {
          s.updateFeature(feature.id, {
            depends_on: [...feature.depends_on, ...prevIds],
          });
        }
      }

      // Re-read features after dependency update
      for (const feature of createdFeatures) {
        const fresh = s.getFeature(feature.id)!;
        result.features.push(fresh);
      }

      // --- Delete manifest file ---
      try {
        unlinkSync(path);
        result.deleted.push(path);
      } catch {
        // Warn but don't fail
      }
    }
  });

  // --- Save GitHub sync file ---
  if (Object.keys(githubSync).length > 0) {
    saveGitHubSync(projectRoot, githubSync);
  }

  // --- Validation ---
  await store.transact((s) => {
    const allEpics = s.listEpics();
    for (const epic of allEpics) {
      const features = s.listFeatures(epic.id);
      for (const feature of features) {
        // Check parent exists
        if (!s.getEpic(feature.parent)) {
          result.validation.valid = false;
          result.validation.orphanFeatures.push(feature.id);
        }

        // Check depends_on resolve
        for (const depId of feature.depends_on) {
          if (!s.getFeature(depId) && !s.getEpic(depId)) {
            result.validation.valid = false;
            result.validation.unresolvedDeps.push(`${feature.id} -> ${depId}`);
          }
        }
      }
    }
  });

  return result;
}

// --- CLI entry point ---

export async function importCommand(
  store: JsonFileStore,
  _args: string[],
  projectRoot: string,
): Promise<void> {
  const result = await importTestable(store, projectRoot);

  const output = {
    imported: result.epics.length,
    skipped: result.skipped.length,
    deleted: result.deleted.length,
    validation: result.validation,
    epics: result.epics.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
    })),
    features: result.features.map((f) => ({
      id: f.id,
      slug: f.slug,
      parent: f.parent,
    })),
  };

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}
