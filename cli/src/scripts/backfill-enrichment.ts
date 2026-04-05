/**
 * One-time backfill script — reconciles all existing epics against
 * the current sync standards: titles, bodies, branches, tags, commits,
 * and branch-issue links.
 *
 * Usage: bun run src/scripts/backfill-enrichment.ts [project-root]
 *
 * Delete after migration is complete.
 */

import * as store from "../manifest/store.js";
import { syncGitHubForEpic } from "../github/sync.js";
import { loadConfig } from "../config.js";
import { discoverGitHub } from "../github/discovery.js";
import type { ResolvedGitHub } from "../github/discovery.js";
import { hasRemote, pushBranches, pushTags } from "../git/push.js";
import { amendCommitsInRange } from "../git/commit-issue-ref.js";
import { linkBranches } from "../github/branch-link.js";
import { git } from "../git/worktree.js";
import { resolve } from "path";

/** Per-epic result tracking. */
export interface EpicBackfillResult {
  slug: string;
  status: "synced" | "skipped" | "errored";
  steps: string[];
  error?: string;
}

/** Aggregate result of the full backfill. */
export interface BackfillResult {
  synced: number;
  skipped: number;
  errored: number;
  epics: EpicBackfillResult[];
}

/** Injectable dependencies for testing. */
export interface BackfillDeps {
  list: typeof store.list;
  load: typeof store.load;
  syncGitHubForEpic: typeof syncGitHubForEpic;
  loadConfig: typeof loadConfig;
  discoverGitHub: typeof discoverGitHub;
  hasRemote: typeof hasRemote;
  pushBranches: typeof pushBranches;
  pushTags: typeof pushTags;
  amendCommitsInRange: typeof amendCommitsInRange;
  linkBranches: typeof linkBranches;
  git: typeof git;
}

const defaultDeps: BackfillDeps = {
  list: store.list,
  load: store.load,
  syncGitHubForEpic,
  loadConfig,
  discoverGitHub,
  hasRemote,
  pushBranches,
  pushTags,
  amendCommitsInRange,
  linkBranches,
  git,
};

/**
 * Run the full backfill — iterates all manifests and reconciles each epic.
 *
 * Reconciliation steps per epic:
 * 1. GitHub sync (titles, bodies, labels, project board)
 * 2. Branch push (feature + impl branches to remote)
 * 3. Tag push (phase tags + archive tags)
 * 4. Commit amend (inject issue refs via rebase, then force-push)
 * 5. Branch-issue linking (createLinkedBranch GraphQL mutation)
 *
 * Each step is skipped when not applicable (no remote, no GitHub issue, etc).
 * Errors are caught per-epic — one failure doesn't stop the batch.
 */
export async function backfill(
  projectRoot: string,
  deps: BackfillDeps = defaultDeps,
): Promise<BackfillResult> {
  const result: BackfillResult = { synced: 0, skipped: 0, errored: 0, epics: [] };

  const config = deps.loadConfig(projectRoot);
  const githubEnabled = config.github.enabled;

  // Check for remote once (pure git, not gated on github.enabled)
  const remoteExists = await deps.hasRemote({ cwd: projectRoot });

  // Discover GitHub metadata once (needed for branch linking)
  let resolved: ResolvedGitHub | undefined;
  if (githubEnabled) {
    resolved = await deps.discoverGitHub(projectRoot);
  }

  const manifests = deps.list(projectRoot);
  console.log(`Found ${manifests.length} manifest(s).`);

  for (const manifest of manifests) {
    const epicResult: EpicBackfillResult = {
      slug: manifest.slug,
      status: "synced",
      steps: [],
    };

    // Skip epics without GitHub issues
    if (!manifest.github?.epic) {
      console.log(`  SKIP  ${manifest.slug} — no GitHub issue`);
      epicResult.status = "skipped";
      result.skipped++;
      result.epics.push(epicResult);
      continue;
    }

    try {
      // Step 1: GitHub sync (titles, bodies, labels)
      if (githubEnabled) {
        await deps.syncGitHubForEpic({
          projectRoot,
          epicSlug: manifest.slug,
          resolved,
        });
        epicResult.steps.push("github-sync");
      }

      // Step 2: Branch push (pure git — not gated on github.enabled)
      if (remoteExists) {
        // Push feature branch
        await deps.pushBranches({
          epicSlug: manifest.slug,
          phase: manifest.phase,
          cwd: projectRoot,
        });
        epicResult.steps.push("branch-push");

        // Push impl branches for each feature
        for (const feature of manifest.features) {
          await deps.pushBranches({
            epicSlug: manifest.slug,
            phase: "implement",
            featureSlug: feature.slug,
            cwd: projectRoot,
          });
        }
        epicResult.steps.push("impl-branch-push");
      }

      // Step 3: Tag push (pure git)
      if (remoteExists) {
        await deps.pushTags({ cwd: projectRoot });
        epicResult.steps.push("tag-push");
      }

      // Step 4: Commit amend (rebase + force-push)
      // Reload manifest in case sync mutated it
      const freshManifest = deps.load(projectRoot, manifest.slug) ?? manifest;
      if (freshManifest.github?.epic) {
        const amendResult = await deps.amendCommitsInRange(
          freshManifest,
          freshManifest.slug,
          freshManifest.phase,
          { cwd: projectRoot },
        );
        if (amendResult.amended > 0) {
          epicResult.steps.push(`commit-amend(${amendResult.amended})`);

          // Force-push after amend (backfill is the only place this is permitted)
          if (remoteExists) {
            const featureBranch = `feature/${manifest.slug}`;
            await deps.git(
              ["push", "--force-with-lease", "origin", featureBranch],
              { cwd: projectRoot, allowFailure: true },
            );
            epicResult.steps.push("force-push");
          }
        }
      }

      // Step 5: Branch-issue linking (gated on github.enabled)
      if (githubEnabled && resolved) {
        await deps.linkBranches({
          repo: resolved.repo,
          epicSlug: manifest.slug,
          epicIssueNumber: manifest.github.epic,
          phase: manifest.phase,
          cwd: projectRoot,
        });
        epicResult.steps.push("branch-link-epic");

        // Link impl branches for features with issue numbers
        for (const feature of manifest.features) {
          if (feature.github?.issue) {
            await deps.linkBranches({
              repo: resolved.repo,
              epicSlug: manifest.slug,
              epicIssueNumber: manifest.github.epic,
              featureSlug: feature.slug,
              featureIssueNumber: feature.github.issue,
              phase: "implement",
              cwd: projectRoot,
            });
          }
        }
        epicResult.steps.push("branch-link-features");
      }

      console.log(`  SYNC  ${manifest.slug} (#${manifest.github.epic}) — [${epicResult.steps.join(", ")}]`);
      result.synced++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR ${manifest.slug} (#${manifest.github.epic}): ${message}`);
      epicResult.status = "errored";
      epicResult.error = message;
      result.errored++;
    }

    result.epics.push(epicResult);
  }

  // Summary
  console.log(`\nBackfill complete: ${result.synced} synced, ${result.skipped} skipped, ${result.errored} errored.`);
  if (result.errored > 0) {
    console.log("Errors:");
    for (const epic of result.epics.filter((e) => e.status === "errored")) {
      console.log(`  ${epic.slug}: ${epic.error}`);
    }
  }

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
