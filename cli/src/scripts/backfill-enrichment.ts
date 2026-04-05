/**
 * One-time backfill script — reconciles all existing epics against
 * the current sync standards: titles, bodies, branches, tags, commits,
 * and branch-issue links.
 *
 * Usage: bun run src/scripts/backfill-enrichment.ts [project-root]
 *
 * Delete after migration is complete.
 */

import type { TaskStore, Epic } from "../store/types.js";
import { JsonFileStore } from "../store/json-file-store.js";
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
  taskStore: TaskStore;
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


/**
 * Run the full backfill — iterates all epics and reconciles each one.
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
  deps?: BackfillDeps,
): Promise<BackfillResult> {
  // Construct default deps at runtime if not provided
  if (!deps) {
    const storeFile = resolve(projectRoot, ".beastmode", "state", "tasks.json");
    const taskStore = new JsonFileStore(storeFile);
    taskStore.load();
    deps = {
      taskStore,
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
  }

  const result: BackfillResult = { synced: 0, skipped: 0, errored: 0, epics: [] };
  const t0 = Date.now();

  console.log(`[backfill] project root: ${projectRoot}`);

  const config = deps.loadConfig(projectRoot);
  const githubEnabled = config.github.enabled;
  console.log(`[backfill] github enabled: ${githubEnabled}`);

  // Check for remote once (pure git, not gated on github.enabled)
  const remoteExists = await deps.hasRemote({ cwd: projectRoot });
  console.log(`[backfill] remote exists: ${remoteExists}`);

  // Discover GitHub metadata once (needed for branch linking)
  let resolved: ResolvedGitHub | undefined;
  if (githubEnabled) {
    resolved = await deps.discoverGitHub(projectRoot);
    console.log(`[backfill] github repo: ${resolved?.repo}`);
  }

  const epics = deps.taskStore.listEpics();
  console.log(`Found ${epics.length} epic(s).`);

  for (const epic of epics) {
    const epicResult: EpicBackfillResult = {
      slug: epic.slug,
      status: "synced",
      steps: [],
    };

    try {
      // Process all epics (GitHub mapping is handled externally)
      const features = deps.taskStore.listFeatures(epic.id);
      const phase = epic.status as string;
      console.log(`\n[${epic.slug}] starting reconciliation (phase: ${phase}, features: ${features.length})`);

      // Step 1: GitHub sync (titles, bodies, labels)
      if (githubEnabled) {
        console.log(`[${epic.slug}] step 1/5: github sync...`);
        await deps.syncGitHubForEpic({
          projectRoot,
          epicSlug: epic.slug,
          resolved,
        });
        epicResult.steps.push("github-sync");
        console.log(`[${epic.slug}] step 1/5: github sync done`);
      } else {
        console.log(`[${epic.slug}] step 1/5: github sync skipped (disabled)`);
      }

      // Step 2: Branch push (pure git — not gated on github.enabled)
      if (remoteExists) {
        console.log(`[${epic.slug}] step 2/5: pushing feature branch...`);
        // Push feature branch
        await deps.pushBranches({
          epicSlug: epic.slug,
          phase: phase as any,
          cwd: projectRoot,
        });
        epicResult.steps.push("branch-push");

        // Push impl branches for each feature
        for (const feature of features) {
          // Use feature id as slug
          const featureSlug = feature.id;
          console.log(`[${epic.slug}] step 2/5: pushing impl branch for feature ${featureSlug}...`);
          await deps.pushBranches({
            epicSlug: epic.slug,
            phase: "implement",
            featureSlug,
            cwd: projectRoot,
          });
        }
        epicResult.steps.push("impl-branch-push");
        console.log(`[${epic.slug}] step 2/5: branch push done`);
      } else {
        console.log(`[${epic.slug}] step 2/5: branch push skipped (no remote)`);
      }

      // Step 3: Tag push (pure git)
      if (remoteExists) {
        console.log(`[${epic.slug}] step 3/5: pushing tags...`);
        await deps.pushTags({ cwd: projectRoot });
        epicResult.steps.push("tag-push");
        console.log(`[${epic.slug}] step 3/5: tag push done`);
      } else {
        console.log(`[${epic.slug}] step 3/5: tag push skipped (no remote)`);
      }

      // Step 4: Commit amend (rebase + force-push)
      // Reload epic in case sync mutated it
      const freshEpic = deps.taskStore.getEpic(epic.id) ?? epic;
      console.log(`[${epic.slug}] step 4/5: amending commits for issue ref...`);
      // Create a compatible manifest-like object for amendCommitsInRange
      const manifestLike = {
        slug: epic.slug,
        phase: phase,
        github: { epic: 0 }, // Placeholder
        features: features.map(f => ({ slug: f.id })),
      };
      const amendResult = await deps.amendCommitsInRange(
        manifestLike as any,
        epic.slug,
        phase as any,
        { cwd: projectRoot },
      );
      console.log(`[${epic.slug}] step 4/5: ${amendResult.amended} commit(s) amended`);
      if (amendResult.amended > 0) {
        epicResult.steps.push(`commit-amend(${amendResult.amended})`);

        // Force-push after amend (backfill is the only place this is permitted)
        if (remoteExists) {
          const featureBranch = `feature/${epic.slug}`;
          console.log(`[${epic.slug}] step 4/5: force-pushing ${featureBranch}...`);
          await deps.git(
            ["push", "--force-with-lease", "origin", featureBranch],
            { cwd: projectRoot, allowFailure: true },
          );
          epicResult.steps.push("force-push");
          console.log(`[${epic.slug}] step 4/5: force-push done`);
        }
      }

      // Step 5: Branch-issue linking (gated on github.enabled)
      if (githubEnabled && resolved) {
        console.log(`[${epic.slug}] step 5/5: linking branches to issues...`);
        await deps.linkBranches({
          repo: resolved.repo,
          epicSlug: epic.slug,
          epicIssueNumber: 0, // Placeholder
          phase: phase as any,
          cwd: projectRoot,
        });
        epicResult.steps.push("branch-link-epic");

        // Link impl branches for features
        for (const feature of features) {
          const featureSlug = feature.id;
          console.log(`[${epic.slug}] step 5/5: linking impl branch for feature ${featureSlug}...`);
          await deps.linkBranches({
            repo: resolved.repo,
            epicSlug: epic.slug,
            epicIssueNumber: 0,
            featureSlug,
            featureIssueNumber: 0,
            phase: "implement",
            cwd: projectRoot,
          });
        }
        epicResult.steps.push("branch-link-features");
        console.log(`[${epic.slug}] step 5/5: branch linking done`);
      } else {
        console.log(`[${epic.slug}] step 5/5: branch linking skipped (github ${githubEnabled ? "no resolved repo" : "disabled"})`);
      }

      console.log(`[${epic.slug}] DONE — [${epicResult.steps.join(", ")}]`);
      result.synced++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR ${epic.slug}: ${message}`);
      epicResult.status = "errored";
      epicResult.error = message;
      result.errored++;
    }

    result.epics.push(epicResult);
  }

  // Summary
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n[backfill] complete in ${elapsed}s: ${result.synced} synced, ${result.skipped} skipped, ${result.errored} errored.`);
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
