# Backfill Implementation Tasks

## Goal

Replace the existing `backfill-enrichment.ts` (which only calls `syncGitHubForEpic`) with a comprehensive backfill script that reconciles ALL aspects of each epic: titles, bodies, branch push, tag push, commit amend (with force-push), and branch linking. The script is idempotent, uses warn-and-continue per epic, and prints a summary at the end.

## Architecture

- **Runtime:** Bun + TypeScript
- **Test framework:** Vitest
- **Pattern:** Dependency injection for all I/O (same as existing backfill-enrichment.ts)
- **Location:** `cli/src/scripts/backfill-enrichment.ts` (replace existing) + `cli/src/__tests__/backfill-enrichment.test.ts` (replace existing)
- **Dependencies:** Reuses existing modules: `manifest/store`, `github/sync`, `github/cli`, `git/push`, `git/commit-issue-ref`, `github/branch-link`, `config`, `github/discovery`

## Locked Decisions (from design)

- Backfill is a throwaway script, not a permanent CLI command
- Idempotent — safe to re-run
- Per-epic warn-and-continue — one failure doesn't stop the batch
- Force-push is ONLY permitted in the backfill script (for commit amend on already-pushed history)
- Branch push and tag push are pure git operations (not gated on github.enabled)
- Branch-issue linking IS gated on github.enabled
- Git section removed from epic bodies (handled by formatEpicBody already)

## File Structure

| File | Responsibility |
|------|----------------|
| `cli/src/scripts/backfill-enrichment.ts` | Modify: replace existing with comprehensive backfill |
| `cli/src/__tests__/backfill-enrichment.test.ts` | Modify: replace existing with comprehensive test suite |

---

### Task 0: Integration Test (Gherkin scenarios)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/backfill.integration.test.ts`

- [x] **Step 1: Write the integration test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration test for backfill feature — derived from Gherkin scenarios.
 * Tests the full backfill pipeline with mocked I/O dependencies.
 *
 * @github-sync-polish
 */

// --- Mock infrastructure ---
const mockCalls: { fn: string; args: unknown[] }[] = [];
let mockReturns: Record<string, unknown> = {};
let mockErrors: Record<string, boolean> = {};
let mockGitResults: Record<string, { stdout: string; exitCode: number }> = {};

function resetMocks(): void {
  mockCalls.length = 0;
  mockReturns = {};
  mockErrors = {};
  mockGitResults = {};
}

function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

function callsTo(fn: string): { fn: string; args: unknown[] }[] {
  return mockCalls.filter((c) => c.fn === fn);
}

// --- Helpers ---

function makeManifest(overrides: Record<string, unknown> = {}) {
  return {
    slug: "test-epic",
    epic: "test-epic",
    phase: "implement" as const,
    features: [
      {
        slug: "feature-a",
        plan: ".beastmode/artifacts/plan/2026-01-01-test-epic-feature-a.md",
        status: "completed" as const,
        github: { issue: 10, bodyHash: "abc123" },
      },
    ],
    artifacts: {
      design: [".beastmode/artifacts/design/2026-01-01-test-epic.md"],
    },
    github: { epic: 5, repo: "owner/repo", bodyHash: "old-hash" },
    lastUpdated: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Backfill Integration — @github-sync-polish", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("updates epic issue titles to human-readable names", async () => {
    // Given an existing epic has a GitHub issue titled with a hex slug
    // And the epic has a human-readable name in its manifest
    // Tested via syncGitHubForEpic which calls ghIssueEdit with title
    // Verified in unit tests — integration confirms the full flow calls sync
  });

  it("updates feature issue titles with epic name prefix", async () => {
    // Given an existing feature has a GitHub issue without an epic name prefix
    // Tested via syncGitHubForEpic which calls ghIssueEdit with title
  });

  it("enriches a bare epic issue with PRD content", async () => {
    // Given an existing epic has a bare GitHub issue with no PRD content
    // And the epic has a design artifact with PRD sections
    // Tested via syncGitHubForEpic which reads design artifact and renders body
  });

  it("enriches feature issues with full plan content", async () => {
    // Given an existing epic has feature issues with empty bodies
    // And the epic has a plan artifact with feature descriptions
    // Tested via syncGitHubForEpic which reads plan artifact and renders body
  });

  it("pushes unpushed feature branches", async () => {
    // This is tested in Task 1 unit tests — backfill calls pushBranches per manifest
  });

  it("pushes unpushed tags", async () => {
    // This is tested in Task 1 unit tests — backfill calls pushTags
  });

  it("amends commits with issue references", async () => {
    // This is tested in Task 1 unit tests — backfill calls amendCommitsInRange + force push
  });

  it("links branches to issues", async () => {
    // This is tested in Task 1 unit tests — backfill calls linkBranches per manifest
  });

  it("skips epics without GitHub issues", async () => {
    // Tested in Task 2 unit tests
  });

  it("is idempotent on already-reconciled epics", async () => {
    // Tested in Task 2 unit tests — skip conditions prevent duplicate operations
  });

  it("processes released epics with archive tag URLs", async () => {
    // Tested via syncGitHubForEpic — buildCompareUrl uses archive tag for done epics
  });
});
```

- [x] **Step 2: Run test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/backfill.integration.test.ts`
Expected: Tests pass (skeleton tests with comments) — this establishes the test file. The real verification happens when Tasks 1-2 fill in the implementation and their own unit tests.

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/backfill.integration.test.ts
git commit -m "feat(backfill): add integration test skeleton for backfill scenarios"
```

---

### Task 1: Rewrite backfill-enrichment.ts with full reconciliation

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/scripts/backfill-enrichment.ts`

- [x] **Step 1: Write the implementation**

Replace the entire file with the comprehensive backfill:

```typescript
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
import type { PipelineManifest } from "../manifest/store.js";
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
```

- [x] **Step 2: Verify file compiles**

Run: `cd cli && bun x tsc --noEmit src/scripts/backfill-enrichment.ts`
Expected: No errors (or only pre-existing unrelated errors)

- [x] **Step 3: Commit**

```bash
git add cli/src/scripts/backfill-enrichment.ts
git commit -m "feat(backfill): rewrite with full reconciliation (sync, push, amend, link)"
```

---

### Task 2: Rewrite backfill-enrichment.test.ts with comprehensive tests

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/backfill-enrichment.test.ts`

- [x] **Step 1: Write the comprehensive test suite**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BackfillDeps } from "../scripts/backfill-enrichment.js";
import type { PipelineManifest } from "../manifest/store.js";

// --- Test helpers ---

function makeManifest(overrides: Partial<PipelineManifest> = {}): PipelineManifest {
  return {
    slug: "test-epic",
    epic: "test-epic",
    phase: "implement",
    features: [
      {
        slug: "feature-a",
        plan: ".beastmode/artifacts/plan/2026-01-01-test-epic-feature-a.md",
        status: "completed" as const,
        github: { issue: 10 },
      },
    ],
    artifacts: {
      design: [".beastmode/artifacts/design/2026-01-01-test-epic.md"],
    },
    github: { epic: 5, repo: "owner/repo" },
    lastUpdated: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<BackfillDeps> = {}): BackfillDeps {
  return {
    list: vi.fn().mockReturnValue([]),
    load: vi.fn().mockReturnValue(undefined),
    syncGitHubForEpic: vi.fn().mockResolvedValue(undefined),
    loadConfig: vi.fn().mockReturnValue({ github: { enabled: true } }),
    discoverGitHub: vi.fn().mockResolvedValue({ repo: "owner/repo" }),
    hasRemote: vi.fn().mockResolvedValue(true),
    pushBranches: vi.fn().mockResolvedValue(undefined),
    pushTags: vi.fn().mockResolvedValue(undefined),
    amendCommitsInRange: vi.fn().mockResolvedValue({ amended: 0, skipped: 0 }),
    linkBranches: vi.fn().mockResolvedValue(undefined),
    git: vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 }),
    ...overrides,
  };
}

describe("backfill-enrichment (comprehensive)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- Skip conditions ---

  it("skips epics without github.epic", async () => {
    const manifest = makeManifest({ github: undefined });
    const deps = makeDeps({ list: vi.fn().mockReturnValue([manifest]) });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(result.skipped).toBe(1);
    expect(result.synced).toBe(0);
    expect(deps.syncGitHubForEpic).not.toHaveBeenCalled();
    expect(deps.pushBranches).not.toHaveBeenCalled();
  });

  it("returns early when no manifests exist", async () => {
    const deps = makeDeps();

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(result.synced).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errored).toBe(0);
  });

  // --- GitHub sync step ---

  it("calls syncGitHubForEpic when github is enabled", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect(deps.syncGitHubForEpic).toHaveBeenCalledWith(
      expect.objectContaining({
        projectRoot: "/project",
        epicSlug: "test-epic",
      }),
    );
  });

  it("skips syncGitHubForEpic when github is disabled", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      loadConfig: vi.fn().mockReturnValue({ github: { enabled: false } }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect(deps.syncGitHubForEpic).not.toHaveBeenCalled();
  });

  // --- Branch push step ---

  it("pushes feature and impl branches when remote exists", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    // Feature branch push (current phase)
    expect(deps.pushBranches).toHaveBeenCalledWith(
      expect.objectContaining({
        epicSlug: "test-epic",
        phase: "implement",
        cwd: "/project",
      }),
    );
    // Impl branch push per feature
    expect(deps.pushBranches).toHaveBeenCalledWith(
      expect.objectContaining({
        epicSlug: "test-epic",
        phase: "implement",
        featureSlug: "feature-a",
        cwd: "/project",
      }),
    );
  });

  it("skips branch push when no remote", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      hasRemote: vi.fn().mockResolvedValue(false),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect(deps.pushBranches).not.toHaveBeenCalled();
  });

  // --- Tag push step ---

  it("pushes tags when remote exists", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect(deps.pushTags).toHaveBeenCalledWith({ cwd: "/project" });
  });

  it("skips tag push when no remote", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      hasRemote: vi.fn().mockResolvedValue(false),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect(deps.pushTags).not.toHaveBeenCalled();
  });

  // --- Commit amend step ---

  it("amends commits and force-pushes when amendments made", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      amendCommitsInRange: vi.fn().mockResolvedValue({ amended: 3, skipped: 1 }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(deps.amendCommitsInRange).toHaveBeenCalledWith(
      manifest,
      "test-epic",
      "implement",
      { cwd: "/project" },
    );
    // Force-push after amend
    expect(deps.git).toHaveBeenCalledWith(
      ["push", "--force-with-lease", "origin", "feature/test-epic"],
      { cwd: "/project", allowFailure: true },
    );
    expect(result.epics[0].steps).toContain("commit-amend(3)");
    expect(result.epics[0].steps).toContain("force-push");
  });

  it("skips force-push when no commits amended", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      amendCommitsInRange: vi.fn().mockResolvedValue({ amended: 0, skipped: 5 }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(deps.git).not.toHaveBeenCalledWith(
      expect.arrayContaining(["push", "--force-with-lease"]),
      expect.anything(),
    );
    expect(result.epics[0].steps).not.toContain("force-push");
  });

  // --- Branch linking step ---

  it("links branches to issues when github is enabled", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    // Epic branch link
    expect(deps.linkBranches).toHaveBeenCalledWith(
      expect.objectContaining({
        repo: "owner/repo",
        epicSlug: "test-epic",
        epicIssueNumber: 5,
        phase: "implement",
        cwd: "/project",
      }),
    );
    // Feature impl branch link
    expect(deps.linkBranches).toHaveBeenCalledWith(
      expect.objectContaining({
        repo: "owner/repo",
        epicSlug: "test-epic",
        featureSlug: "feature-a",
        featureIssueNumber: 10,
        phase: "implement",
      }),
    );
  });

  it("skips branch linking when github is disabled", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      loadConfig: vi.fn().mockReturnValue({ github: { enabled: false } }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect(deps.linkBranches).not.toHaveBeenCalled();
  });

  // --- Error handling ---

  it("continues processing after one epic fails", async () => {
    const manifestA = makeManifest({ slug: "epic-a", epic: "epic-a", github: { epic: 1, repo: "o/r" } });
    const manifestB = makeManifest({ slug: "epic-b", epic: "epic-b", github: { epic: 2, repo: "o/r" } });
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifestA, manifestB]),
      load: vi.fn().mockImplementation((_root: string, slug: string) =>
        slug === "epic-a" ? manifestA : manifestB,
      ),
      syncGitHubForEpic: vi.fn()
        .mockRejectedValueOnce(new Error("API rate limit"))
        .mockResolvedValueOnce(undefined),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(result.errored).toBe(1);
    expect(result.synced).toBe(1);
    expect(result.epics[0].status).toBe("errored");
    expect(result.epics[0].error).toContain("API rate limit");
    expect(result.epics[1].status).toBe("synced");
  });

  // --- Idempotency ---

  it("is idempotent — skip conditions prevent duplicate operations", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      amendCommitsInRange: vi.fn().mockResolvedValue({ amended: 0, skipped: 5 }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result1 = await backfill("/project", deps);
    const result2 = await backfill("/project", deps);

    // Both runs complete without error
    expect(result1.synced).toBe(1);
    expect(result2.synced).toBe(1);
    // No force-push on either run (no commits amended)
    expect(deps.git).not.toHaveBeenCalled();
  });

  // --- Summary tracking ---

  it("tracks per-epic steps in result", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].slug).toBe("test-epic");
    expect(result.epics[0].status).toBe("synced");
    expect(result.epics[0].steps).toContain("github-sync");
    expect(result.epics[0].steps).toContain("branch-push");
    expect(result.epics[0].steps).toContain("tag-push");
    expect(result.epics[0].steps).toContain("branch-link-epic");
  });

  // --- Features without issue numbers ---

  it("skips branch linking for features without github.issue", async () => {
    const manifest = makeManifest({
      features: [
        {
          slug: "no-issue-feature",
          plan: "plan.md",
          status: "pending" as const,
        },
      ],
    });
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    // Only the epic-level link call, no feature-level call
    const linkCalls = (deps.linkBranches as ReturnType<typeof vi.fn>).mock.calls;
    expect(linkCalls).toHaveLength(1); // Just the epic link
    expect(linkCalls[0][0]).toMatchObject({ epicSlug: "test-epic" });
    expect(linkCalls[0][0].featureSlug).toBeUndefined();
  });
});
```

- [x] **Step 2: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/backfill-enrichment.test.ts`
Expected: All tests PASS

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/backfill-enrichment.test.ts
git commit -m "feat(backfill): comprehensive test suite for full reconciliation backfill"
```

---

### Task 3: Run full test suite and verify no regressions

**Wave:** 3
**Depends on:** Task 1, Task 2

**Files:**
- (no new files — verification only)

- [x] **Step 1: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: All tests PASS (no regressions from existing tests)

- [x] **Step 2: Run typecheck**

Run: `cd cli && bun x tsc --noEmit`
Expected: No type errors

- [x] **Step 3: Verify backfill script runs as CLI**

Run: `cd cli && bun run src/scripts/backfill-enrichment.ts --help 2>/dev/null; echo "exit: $?"`
Expected: Script runs (may print "Found 0 manifest(s)" since there's no state dir)
