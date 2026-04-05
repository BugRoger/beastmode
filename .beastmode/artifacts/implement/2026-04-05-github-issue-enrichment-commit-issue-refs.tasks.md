# Commit Issue References — Implementation Tasks

## Goal

Add a post-checkpoint step in the pipeline runner that amends the most recent commit message to append a GitHub issue reference `(#N)`. Three commit types: phase checkpoint → epic issue, impl task → feature issue, release squash-merge → epic issue.

## Architecture

- **New module:** `cli/src/git/commit-issue-ref.ts` — pure functions for branch parsing, issue resolution, and commit amend
- **Integration point:** `cli/src/pipeline/runner.ts` — post-sync step (after Step 8, before Step 9)
- **Test framework:** Vitest with real git repos (matching `worktree.test.ts` pattern)
- **No-op behavior:** If no issue number resolves, skip amend silently

## Tech Stack

- TypeScript, Bun runtime
- Vitest for tests
- `git()` helper from `cli/src/git/worktree.ts`
- Manifest types from `cli/src/manifest/store.ts`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/git/commit-issue-ref.ts` | Create | Pure functions: `parseImplBranch`, `resolveIssueNumber`, `amendCommitWithIssueRef` |
| `cli/src/__tests__/commit-issue-ref.test.ts` | Create | Unit + integration tests for all three commit types and edge cases |
| `cli/src/pipeline/runner.ts` | Modify | Insert post-sync call to `amendCommitWithIssueRef` |

---

### Task 0: Create commit-issue-ref module with pure functions

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/git/commit-issue-ref.ts`

- [ ] **Step 1: Create the module with all functions**

```typescript
// cli/src/git/commit-issue-ref.ts

/**
 * Commit issue reference — amends the most recent commit message to append
 * a GitHub issue reference (#N).
 *
 * Three commit types:
 * 1. Phase checkpoint (feature/<slug> branch) → epic issue number
 * 2. Impl task (impl/<slug>--<feature> branch) → feature issue number
 * 3. Release squash-merge (main branch) → epic issue number
 *
 * No-op when issue number is unavailable.
 */

import { git } from "./worktree.js";
import type { PipelineManifest } from "../manifest/store.js";

/** Result of parsing an impl branch name. */
export interface ImplBranchParts {
  slug: string;
  feature: string;
}

/**
 * Parse an impl branch name into slug and feature parts.
 * Returns undefined if the branch doesn't match `impl/<slug>--<feature>`.
 */
export function parseImplBranch(branchName: string): ImplBranchParts | undefined {
  const match = branchName.match(/^impl\/(.+?)--(.+)$/);
  if (!match) return undefined;
  return { slug: match[1], feature: match[2] };
}

/**
 * Resolve the issue number for the current branch from the manifest.
 *
 * - impl/<slug>--<feature> → feature issue number from manifest.features
 * - feature/<slug> → epic issue number from manifest.github.epic
 * - main/master → epic issue number from manifest.github.epic
 * - anything else → undefined (no-op)
 */
export function resolveIssueNumber(
  branchName: string,
  manifest: PipelineManifest,
): number | undefined {
  // Impl branch → feature issue
  const implParts = parseImplBranch(branchName);
  if (implParts) {
    const feature = manifest.features.find((f) => f.slug === implParts.feature);
    return feature?.github?.issue;
  }

  // Feature branch → epic issue
  if (branchName.startsWith("feature/")) {
    return manifest.github?.epic;
  }

  // Main/master → epic issue (release squash-merge)
  if (branchName === "main" || branchName === "master") {
    return manifest.github?.epic;
  }

  return undefined;
}

/**
 * Append an issue reference to a commit message subject line.
 * Only modifies the first line. Preserves body if present.
 * No-op if the subject already ends with a parenthetical issue ref.
 */
export function appendIssueRef(message: string, issueNumber: number): string {
  const lines = message.split("\n");
  const subject = lines[0];

  // Already has an issue ref — don't double-append
  if (/\(#\d+\)$/.test(subject.trim())) {
    return message;
  }

  lines[0] = `${subject} (#${issueNumber})`;
  return lines.join("\n");
}

/**
 * Amend the most recent commit to append an issue reference.
 *
 * Reads the current branch name and manifest, resolves the issue number,
 * and amends the commit message. No-op if:
 * - Branch can't be determined
 * - Issue number can't be resolved
 * - Commit message already has an issue ref
 */
export async function amendCommitWithIssueRef(
  manifest: PipelineManifest,
  opts: { cwd?: string } = {},
): Promise<{ amended: boolean; issueNumber?: number }> {
  // Get current branch name
  const branchResult = await git(
    ["rev-parse", "--abbrev-ref", "HEAD"],
    { cwd: opts.cwd, allowFailure: true },
  );
  if (branchResult.exitCode !== 0) {
    return { amended: false };
  }
  const branchName = branchResult.stdout;

  // Resolve issue number
  const issueNumber = resolveIssueNumber(branchName, manifest);
  if (!issueNumber) {
    return { amended: false };
  }

  // Get current commit message
  const msgResult = await git(
    ["log", "-1", "--format=%B"],
    { cwd: opts.cwd, allowFailure: true },
  );
  if (msgResult.exitCode !== 0) {
    return { amended: false };
  }
  const currentMessage = msgResult.stdout;

  // Append issue ref
  const newMessage = appendIssueRef(currentMessage, issueNumber);
  if (newMessage === currentMessage) {
    return { amended: false };
  }

  // Amend the commit
  await git(
    ["commit", "--amend", "-m", newMessage],
    { cwd: opts.cwd },
  );

  return { amended: true, issueNumber };
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd cli && npx tsc --noEmit src/git/commit-issue-ref.ts`
Expected: No errors (or run `bun build --target=bun src/git/commit-issue-ref.ts` to check)

---

### Task 1: Write unit tests for pure functions

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Create: `cli/src/__tests__/commit-issue-ref.test.ts`

- [ ] **Step 1: Write tests for parseImplBranch**

```typescript
// cli/src/__tests__/commit-issue-ref.test.ts

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseImplBranch,
  resolveIssueNumber,
  appendIssueRef,
  amendCommitWithIssueRef,
} from "../git/commit-issue-ref.js";
import { git } from "../git/worktree.js";
import type { PipelineManifest } from "../manifest/store.js";

// --- Pure function tests (no git repo needed) ---

describe("parseImplBranch", () => {
  test("parses valid impl branch name", () => {
    const result = parseImplBranch("impl/my-epic-5aa1b9--commit-issue-refs");
    expect(result).toEqual({ slug: "my-epic-5aa1b9", feature: "commit-issue-refs" });
  });

  test("parses impl branch with hyphenated slug and feature", () => {
    const result = parseImplBranch("impl/foo-bar-baz--my-feature");
    expect(result).toEqual({ slug: "foo-bar-baz", feature: "my-feature" });
  });

  test("returns undefined for feature branch", () => {
    expect(parseImplBranch("feature/my-epic")).toBeUndefined();
  });

  test("returns undefined for main branch", () => {
    expect(parseImplBranch("main")).toBeUndefined();
  });

  test("returns undefined for empty string", () => {
    expect(parseImplBranch("")).toBeUndefined();
  });

  test("returns undefined for impl/ without double-dash", () => {
    expect(parseImplBranch("impl/no-double-dash")).toBeUndefined();
  });
});

describe("resolveIssueNumber", () => {
  const manifest: PipelineManifest = {
    slug: "my-epic-5aa1b9",
    epic: "my-epic",
    phase: "implement",
    features: [
      {
        slug: "commit-issue-refs",
        plan: "plan.md",
        status: "in-progress",
        github: { issue: 99 },
      },
      {
        slug: "other-feature",
        plan: "other.md",
        status: "pending",
      },
    ],
    artifacts: {},
    github: { epic: 42, repo: "owner/repo" },
    lastUpdated: "2026-04-05T00:00:00Z",
  };

  test("resolves feature issue for impl branch", () => {
    expect(resolveIssueNumber("impl/my-epic-5aa1b9--commit-issue-refs", manifest)).toBe(99);
  });

  test("returns undefined for impl branch with unknown feature", () => {
    expect(resolveIssueNumber("impl/my-epic-5aa1b9--unknown-feature", manifest)).toBeUndefined();
  });

  test("returns undefined for impl branch feature without github issue", () => {
    expect(resolveIssueNumber("impl/my-epic-5aa1b9--other-feature", manifest)).toBeUndefined();
  });

  test("resolves epic issue for feature branch", () => {
    expect(resolveIssueNumber("feature/my-epic-5aa1b9", manifest)).toBe(42);
  });

  test("resolves epic issue for main branch", () => {
    expect(resolveIssueNumber("main", manifest)).toBe(42);
  });

  test("resolves epic issue for master branch", () => {
    expect(resolveIssueNumber("master", manifest)).toBe(42);
  });

  test("returns undefined for unrecognized branch", () => {
    expect(resolveIssueNumber("develop", manifest)).toBeUndefined();
  });

  test("returns undefined when manifest has no github", () => {
    const noGithub: PipelineManifest = { ...manifest, github: undefined };
    expect(resolveIssueNumber("feature/my-epic", noGithub)).toBeUndefined();
  });
});

describe("appendIssueRef", () => {
  test("appends issue ref to simple message", () => {
    expect(appendIssueRef("design(epic): checkpoint", 42)).toBe("design(epic): checkpoint (#42)");
  });

  test("preserves message body", () => {
    const msg = "design(epic): checkpoint\n\nDetailed description here.";
    const result = appendIssueRef(msg, 42);
    expect(result).toBe("design(epic): checkpoint (#42)\n\nDetailed description here.");
  });

  test("does not double-append if already has issue ref", () => {
    const msg = "design(epic): checkpoint (#42)";
    expect(appendIssueRef(msg, 42)).toBe(msg);
  });

  test("does not double-append with different issue number", () => {
    const msg = "design(epic): checkpoint (#99)";
    expect(appendIssueRef(msg, 42)).toBe(msg);
  });

  test("appends to impl task commit", () => {
    expect(appendIssueRef("feat(commit-issue-refs): add parsing", 99))
      .toBe("feat(commit-issue-refs): add parsing (#99)");
  });

  test("appends to release commit", () => {
    expect(appendIssueRef("release(my-epic): v1.0.0", 42))
      .toBe("release(my-epic): v1.0.0 (#42)");
  });
});

// --- Integration tests (real git repo) ---

describe("amendCommitWithIssueRef", () => {
  let repoDir: string;

  const manifest: PipelineManifest = {
    slug: "test-epic-abc123",
    epic: "test-epic",
    phase: "implement",
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
    repoDir = await mkdtemp(join(tmpdir(), "beastmode-issue-ref-test-"));
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

  test("amends checkpoint commit on feature branch with epic ref", async () => {
    // Create and switch to feature branch
    await git(["checkout", "-b", "feature/test-epic-abc123"], { cwd: repoDir });
    await Bun.write(join(repoDir, "file.txt"), "content\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design(test-epic): checkpoint"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(manifest, { cwd: repoDir });

    expect(result.amended).toBe(true);
    expect(result.issueNumber).toBe(42);

    // Verify commit message was amended
    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("design(test-epic): checkpoint (#42)");

    // Clean up branch
    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123"], { cwd: repoDir });
  });

  test("amends impl task commit on impl branch with feature ref", async () => {
    await git(["checkout", "-b", "impl/test-epic-abc123--my-feature"], { cwd: repoDir });
    await Bun.write(join(repoDir, "impl.txt"), "impl content\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "feat(my-feature): add parsing"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(manifest, { cwd: repoDir });

    expect(result.amended).toBe(true);
    expect(result.issueNumber).toBe(77);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("feat(my-feature): add parsing (#77)");

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "impl/test-epic-abc123--my-feature"], { cwd: repoDir });
  });

  test("amends release commit on main with epic ref", async () => {
    await Bun.write(join(repoDir, "release.txt"), "release content\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "release(test-epic): v1.0.0"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(manifest, { cwd: repoDir });

    expect(result.amended).toBe(true);
    expect(result.issueNumber).toBe(42);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("release(test-epic): v1.0.0 (#42)");
  });

  test("no-op when manifest has no github", async () => {
    await Bun.write(join(repoDir, "noop.txt"), "noop\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "some commit"], { cwd: repoDir });

    const noGithub: PipelineManifest = { ...manifest, github: undefined };
    const result = await amendCommitWithIssueRef(noGithub, { cwd: repoDir });

    expect(result.amended).toBe(false);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("some commit");
  });

  test("no-op when commit already has issue ref", async () => {
    await Bun.write(join(repoDir, "already.txt"), "already\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design(test-epic): checkpoint (#42)"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(manifest, { cwd: repoDir });

    expect(result.amended).toBe(false);

    // Message unchanged
    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("design(test-epic): checkpoint (#42)");
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd cli && npx vitest run src/__tests__/commit-issue-ref.test.ts`
Expected: All tests pass

---

### Task 2: Integrate into pipeline runner

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/pipeline/runner.ts`

- [ ] **Step 1: Add import and post-sync amend step**

Add import at the top of `runner.ts`:

```typescript
import { amendCommitWithIssueRef } from "../git/commit-issue-ref.js";
```

Add a new step after the GitHub sync block (after line 326, before Step 9 comment). Insert between the end of the Step 8 try/catch and the Step 9 comment:

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

- [ ] **Step 2: Verify build compiles**

Run: `cd cli && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run existing runner tests to ensure no regression**

Run: `cd cli && npx vitest run src/__tests__/pipeline-runner.test.ts`
Expected: All existing tests pass

- [ ] **Step 4: Commit**

```bash
git add cli/src/git/commit-issue-ref.ts cli/src/__tests__/commit-issue-ref.test.ts cli/src/pipeline/runner.ts
git commit -m "feat(commit-issue-refs): add post-checkpoint commit issue reference amend step"
```
