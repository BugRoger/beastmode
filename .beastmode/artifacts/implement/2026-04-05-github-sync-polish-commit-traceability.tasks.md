# Commit Traceability — Implementation Tasks

## Goal

Extend the commit-issue-ref module from single-commit HEAD amendment to range-based rebase. After phase dispatch and before push, rebase all commits since the last phase tag to inject `(#N)` issue references.

## Architecture

- **Range detection:** Previous phase tag (`beastmode/<slug>/<previous-phase>`) to HEAD. First phase (design) uses merge-base with main.
- **Issue routing per commit:** `feat(<feature>):` → feature issue number. `implement(<slug>--<feature>):` → feature issue number. Everything else → epic issue number.
- **Rebase strategy:** `git rebase --exec` with a shell script that checks each commit and amends if needed. The shell script reads a mapping file written by the TypeScript function before starting the rebase. Shell script uses only `git` and `sh` — no Bun dependency during rebase.
- **Ordering:** Runs post-sync, pre-push (Step 8.5 in runner). Same position as the current single-commit amend.
- **No force-push needed:** Amend runs before the first push.

## Tech Stack

- TypeScript, Bun runtime, vitest (run via `cd cli && bun --bun vitest run`)
- Git subprocess via `git()` helper from `cli/src/git/worktree.ts`
- Phase tags via `tagName()` from `cli/src/git/tags.ts`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/git/commit-issue-ref.ts` | Modify | Add `resolveCommitIssueNumber`, `resolveRangeStart`, `amendCommitsInRange` |
| `cli/src/__tests__/commit-issue-ref.test.ts` | Modify | Add unit + integration tests for new functions |
| `cli/src/pipeline/runner.ts` | Modify | Replace `amendCommitWithIssueRef` call with `amendCommitsInRange` |

---

### Task 1: Add `resolveCommitIssueNumber` pure function

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/git/commit-issue-ref.ts`
- Modify: `cli/src/__tests__/commit-issue-ref.test.ts`

- [ ] **Step 1: Write failing tests for `resolveCommitIssueNumber`**

Add after the `appendIssueRef` describe block in the test file. Import `resolveCommitIssueNumber` in the existing import statement.

```typescript
describe("resolveCommitIssueNumber", () => {
  const manifest: PipelineManifest = {
    slug: "my-epic-5aa1b9",
    epic: "my-epic",
    phase: "implement",
    features: [
      {
        slug: "commit-traceability",
        plan: "plan.md",
        status: "in-progress",
        github: { issue: 99 },
      },
      {
        slug: "body-enrichment",
        plan: "other.md",
        status: "completed",
        github: { issue: 88 },
      },
    ],
    artifacts: {},
    github: { epic: 42, repo: "owner/repo" },
    lastUpdated: "2026-04-05T00:00:00Z",
  };

  test("returns epic issue for phase checkpoint commit", () => {
    expect(resolveCommitIssueNumber("implement(my-epic): checkpoint", manifest)).toBe(42);
  });

  test("returns epic issue for design checkpoint", () => {
    expect(resolveCommitIssueNumber("design(my-epic): checkpoint", manifest)).toBe(42);
  });

  test("returns feature issue for feat(<feature>): prefix", () => {
    expect(resolveCommitIssueNumber("feat(commit-traceability): add parsing", manifest)).toBe(99);
  });

  test("returns feature issue for implement(<slug>--<feature>): prefix", () => {
    expect(resolveCommitIssueNumber("implement(my-epic-5aa1b9--commit-traceability): checkpoint", manifest)).toBe(99);
  });

  test("returns epic issue for unrecognized commit message format", () => {
    expect(resolveCommitIssueNumber("some random commit", manifest)).toBe(42);
  });

  test("falls back to epic when feature slug not found", () => {
    expect(resolveCommitIssueNumber("feat(unknown-feature): something", manifest)).toBe(42);
  });

  test("returns undefined when no github on manifest", () => {
    const noGithub: PipelineManifest = { ...manifest, github: undefined };
    expect(resolveCommitIssueNumber("design(my-epic): checkpoint", noGithub)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/commit-issue-ref.test.ts`
Expected: FAIL — `resolveCommitIssueNumber` is not exported from `commit-issue-ref.ts`

- [ ] **Step 3: Implement `resolveCommitIssueNumber`**

Add to `cli/src/git/commit-issue-ref.ts` after the `appendIssueRef` function, before `amendCommitWithIssueRef`:

```typescript
/**
 * Phase ordering for range-start resolution.
 */
const PHASE_ORDER = ["design", "plan", "implement", "validate", "release"] as const;

/**
 * Resolve the issue number for a specific commit based on its message.
 *
 * Routing:
 * - `feat(<feature>): ...` → feature issue (impl task commit)
 * - `implement(<slug>--<feature>): ...` → feature issue (impl checkpoint)
 * - Everything else → epic issue (phase checkpoints, misc)
 *
 * Falls back to epic issue if feature not found in manifest.
 * Returns undefined if manifest has no github config.
 */
export function resolveCommitIssueNumber(
  commitMessage: string,
  manifest: PipelineManifest,
): number | undefined {
  if (!manifest.github?.epic) return undefined;

  // feat(<feature>): pattern — impl task commits
  const featMatch = commitMessage.match(/^feat\(([^)]+)\):/);
  if (featMatch) {
    const featureSlug = featMatch[1];
    const feature = manifest.features.find((f) => f.slug === featureSlug);
    if (feature?.github?.issue) return feature.github.issue;
    return manifest.github.epic;
  }

  // implement(<slug>--<feature>): pattern — impl branch checkpoint
  const implMatch = commitMessage.match(/^implement\([^)]*--([^)]+)\):/);
  if (implMatch) {
    const featureSlug = implMatch[1];
    const feature = manifest.features.find((f) => f.slug === featureSlug);
    if (feature?.github?.issue) return feature.github.issue;
    return manifest.github.epic;
  }

  // Default: epic issue (phase checkpoints, misc commits)
  return manifest.github.epic;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/commit-issue-ref.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/git/commit-issue-ref.ts cli/src/__tests__/commit-issue-ref.test.ts
git commit -m "feat(commit-traceability): add resolveCommitIssueNumber for per-commit issue routing"
```

---

### Task 2: Add `resolveRangeStart` and `amendCommitsInRange`

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/git/commit-issue-ref.ts`
- Modify: `cli/src/__tests__/commit-issue-ref.test.ts`

- [ ] **Step 1: Write integration tests**

Add new imports at the top of the test file:

```typescript
import {
  parseImplBranch,
  resolveIssueNumber,
  appendIssueRef,
  amendCommitWithIssueRef,
  resolveCommitIssueNumber,
  resolveRangeStart,
  amendCommitsInRange,
} from "../git/commit-issue-ref.js";
```

Add two new describe blocks after the `amendCommitWithIssueRef` describe:

```typescript
describe("resolveRangeStart", () => {
  let repoDir: string;

  beforeAll(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "beastmode-range-start-"));
    await git(["init", "-b", "main"], { cwd: repoDir });
    await git(["config", "user.email", "test@test.com"], { cwd: repoDir });
    await git(["config", "user.name", "Test"], { cwd: repoDir });
    await Bun.write(join(repoDir, "README.md"), "# Test\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "initial commit"], { cwd: repoDir });
  });

  afterAll(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  test("returns previous phase tag SHA for plan phase", async () => {
    await git(["checkout", "-b", "feature/test-slug"], { cwd: repoDir });
    await Bun.write(join(repoDir, "d.txt"), "d\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design checkpoint"], { cwd: repoDir });
    await git(["tag", "beastmode/test-slug/design"], { cwd: repoDir });

    await Bun.write(join(repoDir, "p.txt"), "p\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan checkpoint"], { cwd: repoDir });

    const result = await resolveRangeStart("test-slug", "plan", { cwd: repoDir });
    const tagSha = (await git(["rev-parse", "beastmode/test-slug/design"], { cwd: repoDir })).stdout;
    expect(result).toBe(tagSha);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-slug"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-slug/design"], { cwd: repoDir });
  });

  test("returns merge-base for design phase (no previous tag)", async () => {
    await git(["checkout", "-b", "feature/new-slug"], { cwd: repoDir });
    await Bun.write(join(repoDir, "n.txt"), "n\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design checkpoint"], { cwd: repoDir });

    const result = await resolveRangeStart("new-slug", "design", { cwd: repoDir });
    const mergeBase = (await git(["merge-base", "main", "HEAD"], { cwd: repoDir })).stdout;
    expect(result).toBe(mergeBase);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/new-slug"], { cwd: repoDir });
  });

  test("falls back to merge-base when previous phase tag is missing", async () => {
    await git(["checkout", "-b", "feature/missing-tag"], { cwd: repoDir });
    await Bun.write(join(repoDir, "m.txt"), "m\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan checkpoint"], { cwd: repoDir });

    // No design tag exists
    const result = await resolveRangeStart("missing-tag", "plan", { cwd: repoDir });
    const mergeBase = (await git(["merge-base", "main", "HEAD"], { cwd: repoDir })).stdout;
    expect(result).toBe(mergeBase);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/missing-tag"], { cwd: repoDir });
  });
});

describe("amendCommitsInRange", () => {
  let repoDir: string;

  const manifest: PipelineManifest = {
    slug: "test-epic-abc123",
    epic: "test-epic",
    phase: "plan",
    features: [
      {
        slug: "my-feature",
        plan: "plan.md",
        status: "in-progress",
        github: { issue: 77 },
      },
    ],
    artifacts: {},
    github: { epic: 42, repo: "owner/repo" },
    lastUpdated: "2026-04-05T00:00:00Z",
  };

  beforeAll(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "beastmode-range-amend-"));
    await git(["init", "-b", "main"], { cwd: repoDir });
    await git(["config", "user.email", "test@test.com"], { cwd: repoDir });
    await git(["config", "user.name", "Test"], { cwd: repoDir });
    await Bun.write(join(repoDir, "README.md"), "# Test\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "initial commit"], { cwd: repoDir });
  });

  afterAll(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  test("amends multiple commits with epic issue ref", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-multi"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-multi"], { cwd: repoDir });

    await Bun.write(join(repoDir, "f1.txt"), "f1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): first change"], { cwd: repoDir });

    await Bun.write(join(repoDir, "f2.txt"), "f2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): second change"], { cwd: repoDir });

    const result = await amendCommitsInRange(manifest, "test-epic-abc123", "plan", {
      cwd: repoDir,
      rangeStartOverride: "beastmode/test-epic-abc123/design-multi",
    });

    expect(result.amended).toBe(2);
    expect(result.skipped).toBe(0);

    const log = await git(["log", "--format=%s", "beastmode/test-epic-abc123/design-multi..HEAD"], { cwd: repoDir });
    const subjects = log.stdout.split("\n").filter(Boolean);
    expect(subjects).toEqual([
      "plan(test-epic): second change (#42)",
      "plan(test-epic): first change (#42)",
    ]);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-multi"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-epic-abc123/design-multi"], { cwd: repoDir });
  });

  test("skips commits that already have issue refs", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-skip"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-skip"], { cwd: repoDir });

    await Bun.write(join(repoDir, "s1.txt"), "s1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): already done (#42)"], { cwd: repoDir });

    await Bun.write(join(repoDir, "s2.txt"), "s2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): needs ref"], { cwd: repoDir });

    const result = await amendCommitsInRange(manifest, "test-epic-abc123", "plan", {
      cwd: repoDir,
      rangeStartOverride: "beastmode/test-epic-abc123/design-skip",
    });

    expect(result.amended).toBe(1);
    expect(result.skipped).toBe(1);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-skip"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-epic-abc123/design-skip"], { cwd: repoDir });
  });

  test("no-op when all commits already have refs", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-noop"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-noop"], { cwd: repoDir });

    await Bun.write(join(repoDir, "n1.txt"), "n1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): done (#42)"], { cwd: repoDir });

    const result = await amendCommitsInRange(manifest, "test-epic-abc123", "plan", {
      cwd: repoDir,
      rangeStartOverride: "beastmode/test-epic-abc123/design-noop",
    });

    expect(result.amended).toBe(0);
    expect(result.skipped).toBe(1);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-noop"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-epic-abc123/design-noop"], { cwd: repoDir });
  });

  test("routes feat(<feature>) commits to feature issue ref", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-route"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-route"], { cwd: repoDir });

    await Bun.write(join(repoDir, "r1.txt"), "r1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "feat(my-feature): add parsing"], { cwd: repoDir });

    await Bun.write(join(repoDir, "r2.txt"), "r2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "implement(test-epic): checkpoint"], { cwd: repoDir });

    const result = await amendCommitsInRange(manifest, "test-epic-abc123", "plan", {
      cwd: repoDir,
      rangeStartOverride: "beastmode/test-epic-abc123/design-route",
    });

    expect(result.amended).toBe(2);

    const log = await git(["log", "--format=%s", "beastmode/test-epic-abc123/design-route..HEAD"], { cwd: repoDir });
    const subjects = log.stdout.split("\n").filter(Boolean);
    expect(subjects).toEqual([
      "implement(test-epic): checkpoint (#42)",
      "feat(my-feature): add parsing (#77)",
    ]);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-route"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-epic-abc123/design-route"], { cwd: repoDir });
  });

  test("uses merge-base for design phase", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-des"], { cwd: repoDir });

    await Bun.write(join(repoDir, "d1.txt"), "d1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design(test-epic): checkpoint"], { cwd: repoDir });

    const result = await amendCommitsInRange(manifest, "test-epic-abc123", "design", { cwd: repoDir });

    expect(result.amended).toBe(1);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("design(test-epic): checkpoint (#42)");

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-des"], { cwd: repoDir });
  });

  test("returns zero when manifest has no github", async () => {
    const noGithub: PipelineManifest = { ...manifest, github: undefined };
    const result = await amendCommitsInRange(noGithub, "test-epic-abc123", "plan", { cwd: repoDir });
    expect(result.amended).toBe(0);
    expect(result.skipped).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/commit-issue-ref.test.ts`
Expected: FAIL — `resolveRangeStart` and `amendCommitsInRange` not exported

- [ ] **Step 3: Implement `resolveRangeStart`**

Add to `cli/src/git/commit-issue-ref.ts` after `resolveCommitIssueNumber`, before `amendCommitWithIssueRef`. Also add the import for `tagName`:

At the top, add:
```typescript
import { tagName } from "./tags.js";
```

Then the function:
```typescript
/**
 * Resolve the range start SHA for commit amending.
 *
 * Strategy:
 * 1. If current phase has a predecessor, try its tag (`beastmode/<slug>/<prev-phase>`)
 * 2. Fall back to merge-base with main (handles design phase and missing tags)
 */
export async function resolveRangeStart(
  slug: string,
  currentPhase: string,
  opts: { cwd?: string } = {},
): Promise<string | undefined> {
  const phaseIdx = PHASE_ORDER.indexOf(currentPhase as (typeof PHASE_ORDER)[number]);

  // Try previous phase tag
  if (phaseIdx > 0) {
    const prevPhase = PHASE_ORDER[phaseIdx - 1];
    const prevTag = tagName(slug, prevPhase);
    const result = await git(["rev-parse", prevTag], { cwd: opts.cwd, allowFailure: true });
    if (result.exitCode === 0 && result.stdout) {
      return result.stdout;
    }
  }

  // Fallback: merge-base with main
  const mbResult = await git(["merge-base", "main", "HEAD"], { cwd: opts.cwd, allowFailure: true });
  if (mbResult.exitCode === 0 && mbResult.stdout) {
    return mbResult.stdout;
  }

  return undefined;
}
```

- [ ] **Step 4: Implement `amendCommitsInRange`**

Add to `cli/src/git/commit-issue-ref.ts` after `resolveRangeStart`:

```typescript
/** Result of range-based commit amending. */
export interface AmendRangeResult {
  amended: number;
  skipped: number;
}

/**
 * Amend all commits in a range to append issue references.
 *
 * Enumerates commits from range start to HEAD, pre-computes which need
 * amending and their new messages, then uses `git rebase --exec` with
 * a shell script that checks each commit's subject and amends if a
 * matching new message exists in a temporary map file.
 *
 * The shell script uses only git + sh (no Bun dependency during rebase).
 */
export async function amendCommitsInRange(
  manifest: PipelineManifest,
  slug: string,
  currentPhase: string,
  opts: { cwd?: string; rangeStartOverride?: string } = {},
): Promise<AmendRangeResult> {
  if (!manifest.github?.epic) {
    return { amended: 0, skipped: 0 };
  }

  // Resolve range start
  let rangeStart: string | undefined;
  if (opts.rangeStartOverride) {
    const r = await git(["rev-parse", opts.rangeStartOverride], { cwd: opts.cwd, allowFailure: true });
    rangeStart = r.exitCode === 0 ? r.stdout : undefined;
  } else {
    rangeStart = await resolveRangeStart(slug, currentPhase, opts);
  }

  if (!rangeStart) {
    return { amended: 0, skipped: 0 };
  }

  // Get commits in range (oldest first for counting)
  const logResult = await git(
    ["log", "--reverse", "--format=%H|%s", `${rangeStart}..HEAD`],
    { cwd: opts.cwd, allowFailure: true },
  );

  if (logResult.exitCode !== 0 || !logResult.stdout) {
    return { amended: 0, skipped: 0 };
  }

  const commits = logResult.stdout.split("\n").filter(Boolean).map((line) => {
    const idx = line.indexOf("|");
    return { sha: line.slice(0, idx), subject: line.slice(idx + 1) };
  });

  if (commits.length === 0) {
    return { amended: 0, skipped: 0 };
  }

  // Pre-compute amendments: subject → new message
  const amendments = new Map<string, string>();
  let skipped = 0;

  for (const commit of commits) {
    if (/\(#\d+\)$/.test(commit.subject.trim())) {
      skipped++;
      continue;
    }
    const issueNumber = resolveCommitIssueNumber(commit.subject, manifest);
    if (issueNumber) {
      amendments.set(commit.subject, `${commit.subject} (#${issueNumber})`);
    } else {
      skipped++;
    }
  }

  if (amendments.size === 0) {
    return { amended: 0, skipped };
  }

  // Write a temporary map file: each line is "old_subject\tnew_message"
  const { writeFile, unlink } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const cwd = opts.cwd ?? process.cwd();
  const mapPath = join(cwd, ".git", "beastmode-amend-map.txt");

  const mapLines: string[] = [];
  for (const [oldSubject, newMessage] of amendments) {
    // Escape tabs in subjects (unlikely but safe)
    mapLines.push(`${oldSubject}\t${newMessage}`);
  }
  await writeFile(mapPath, mapLines.join("\n") + "\n");

  // Write a shell script that reads current HEAD subject, looks up in map, amends
  const scriptPath = join(cwd, ".git", "beastmode-amend.sh");
  const script = `#!/bin/sh
SUBJECT=$(git log -1 --format=%s)
MAP_FILE="${mapPath}"
# Look up the subject in the map file (tab-separated: old_subject\\tnew_message)
NEW_MSG=$(while IFS=$'\\t' read -r old new; do
  if [ "$old" = "$SUBJECT" ]; then
    printf '%s' "$new"
    break
  fi
done < "$MAP_FILE")
if [ -n "$NEW_MSG" ]; then
  git commit --amend -m "$NEW_MSG"
fi
`;
  await writeFile(scriptPath, script, { mode: 0o755 });

  // Run rebase with exec
  const rebaseResult = await git(
    ["rebase", "--exec", `sh "${scriptPath}"`, rangeStart],
    { cwd: opts.cwd, allowFailure: true },
  );

  // Clean up temp files
  await unlink(mapPath).catch(() => {});
  await unlink(scriptPath).catch(() => {});

  if (rebaseResult.exitCode !== 0) {
    await git(["rebase", "--abort"], { cwd: opts.cwd, allowFailure: true });
    return { amended: 0, skipped };
  }

  return { amended: amendments.size, skipped };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/commit-issue-ref.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add cli/src/git/commit-issue-ref.ts cli/src/__tests__/commit-issue-ref.test.ts
git commit -m "feat(commit-traceability): add resolveRangeStart and amendCommitsInRange"
```

---

### Task 3: Wire range amend into pipeline runner

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/pipeline/runner.ts`

- [ ] **Step 1: Update import in runner**

In `cli/src/pipeline/runner.ts` line 35, change:
```typescript
import { amendCommitWithIssueRef } from "../git/commit-issue-ref.js";
```
to:
```typescript
import { amendCommitsInRange } from "../git/commit-issue-ref.js";
```

- [ ] **Step 2: Update Step 8.5 block in runner**

Replace the Step 8.5 block (lines 335-349) from:
```typescript
  // -- Step 8.5: commit-issue-ref --------------------------------------------
  // Amend the most recent commit to append a GitHub issue reference (#N).
  // Runs post-sync so issue numbers from early-issues or sync are available.
  try {
    const manifest = store.load(config.projectRoot, epicSlug);
    if (manifest) {
      const amendResult = await amendCommitWithIssueRef(manifest, { cwd: worktreePath });
      if (amendResult.amended) {
        logger.detail?.(`commit ref: (#${amendResult.issueNumber})`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`commit issue ref failed (non-blocking): ${message}`);
  }
```
to:
```typescript
  // -- Step 8.5: commit-issue-ref --------------------------------------------
  // Amend all commits since the last phase tag to append GitHub issue refs (#N).
  // Runs post-sync so issue numbers from early-issues or sync are available.
  // Runs pre-push so no force-push is needed.
  try {
    const manifest = store.load(config.projectRoot, epicSlug);
    if (manifest) {
      const rangeResult = await amendCommitsInRange(manifest, epicSlug, config.phase, { cwd: worktreePath });
      if (rangeResult.amended > 0) {
        logger.detail?.(`commit refs: ${rangeResult.amended} amended, ${rangeResult.skipped} skipped`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`commit issue ref failed (non-blocking): ${message}`);
  }
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd cli && bun x tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add cli/src/pipeline/runner.ts
git commit -m "feat(commit-traceability): wire range-based amend into pipeline runner step 8.5"
```
