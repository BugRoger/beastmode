/**
 * One-time backfill script — re-syncs all existing manifests with GitHub issues
 * through the enrichment pipeline so bare issues get full PRD content.
 *
 * Usage: bun run src/scripts/backfill-enrichment.ts [project-root]
 *
 * Delete after migration is complete.
 */

import * as store from "../manifest/store.js";
import { syncGitHubForEpic } from "../github/sync.js";
import { loadConfig } from "../config.js";
import { resolve } from "path";

export interface BackfillDeps {
  list: typeof store.list;
  syncGitHubForEpic: typeof syncGitHubForEpic;
  loadConfig: typeof loadConfig;
}

export interface BackfillResult {
  synced: number;
  skipped: number;
  errored: number;
  errors: string[];
}

export async function backfill(
  projectRoot: string,
  deps: BackfillDeps = { list: store.list, syncGitHubForEpic, loadConfig },
): Promise<BackfillResult> {
  const result: BackfillResult = { synced: 0, skipped: 0, errored: 0, errors: [] };

  const config = deps.loadConfig(projectRoot);
  if (!config.github.enabled) {
    console.log("GitHub sync is disabled in config — nothing to backfill.");
    return result;
  }

  const manifests = deps.list(projectRoot);
  console.log(`Found ${manifests.length} manifest(s).`);

  for (const manifest of manifests) {
    if (!manifest.github?.epic) {
      console.log(`  SKIP  ${manifest.slug} — no GitHub issue`);
      result.skipped++;
      continue;
    }

    try {
      await deps.syncGitHubForEpic({ projectRoot, epicSlug: manifest.slug });
      console.log(`  SYNC  ${manifest.slug} (#${manifest.github.epic})`);
      result.synced++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR ${manifest.slug} (#${manifest.github.epic}): ${message}`);
      result.errored++;
      result.errors.push(`${manifest.slug}: ${message}`);
    }
  }

  console.log(`\nBackfill complete: ${result.synced} synced, ${result.skipped} skipped, ${result.errored} errored.`);
  return result;
}

// CLI entry point
if (import.meta.main) {
  const projectRoot = resolve(process.argv[2] ?? process.cwd());
  backfill(projectRoot).catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
