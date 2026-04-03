# impl-branch-core — Implementation Tasks

## Goal

Replace the `feature/<slug>/<feature>` impl branch naming convention with `impl/<slug>--<feature>`. Add a naming utility, idempotent branch creation, CLI dispatch integration, and release cleanup.

## Architecture

- **Naming convention:** `impl/<slug>--<feature>` — separates impl branches from worktree `feature/<slug>` branches in the git ref namespace
- **`--` separator:** unambiguous boundary between slug and feature name
- **Single source of truth:** `implBranchName()` utility — all callers use this, never string interpolation
- **Idempotent creation:** `createImplBranch()` skips if branch exists, returns name regardless
- **CLI owns creation:** both watch loop and manual CLI call `createImplBranch()` before dispatch
- **Release cleanup:** `remove()` extended to delete all `impl/<slug>--*` branches alongside worktree removal

## Tech Stack

- Runtime: Bun
- Test framework: `bun:test`
- Git operations: `git()` and `gitCheck()` helpers from `cli/src/git/worktree.ts`
- Test pattern: temp repos with `mkdtemp`, real git operations, `afterAll` cleanup

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/git/worktree.ts` | Modify | Add `implBranchName()`, `createImplBranch()`, extend `remove()` |
| `cli/src/__tests__/worktree.test.ts` | Modify | Add tests for new functions |
| `cli/src/commands/watch-loop.ts` | Modify | Call `createImplBranch()` before dispatch in `dispatchFanOut()` |
| `cli/src/pipeline/runner.ts` | Modify | Call `createImplBranch()` before dispatch when phase is implement |

---

### Task 1: implBranchName utility and tests

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/git/worktree.ts`
- Modify: `cli/src/__tests__/worktree.test.ts`

- [x] **Step 1: Write the failing tests**

- [x] **Step 2: Run tests to verify they fail**

- [x] **Step 3: Implement implBranchName**

Add to `cli/src/git/worktree.ts`, after the `WORKTREE_DIR` constant:

```typescript
/**
 * Return the canonical impl branch name for a feature.
 * Single source of truth — all callers use this, never string interpolation.
 *
 * Format: `impl/<slug>--<feature>`
 */
export function implBranchName(slug: string, feature: string): string {
  return `impl/${slug}--${feature}`;
}
```

- [x] **Step 4: Run tests to verify they pass**

- [x] **Step 5: Commit**

---

### Task 2: createImplBranch with idempotent creation and tests

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/git/worktree.ts`
- Modify: `cli/src/__tests__/worktree.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block to `cli/src/__tests__/worktree.test.ts`:

```typescript
describe("createImplBranch", () => {
  test("creates impl branch from current HEAD when it does not exist", async () => {
    // Get current HEAD
    const headSha = (await git(["rev-parse", "HEAD"], { cwd: repoDir })).stdout;

    const branchName = await createImplBranch("test-create-impl", "feat-a", { cwd: repoDir });

    expect(branchName).toBe("impl/test-create-impl--feat-a");

    // Verify branch exists
    const branchExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`],
      { cwd: repoDir },
    );
    expect(branchExists).toBe(true);

    // Verify branch points to HEAD
    const branchSha = (await git(["rev-parse", branchName], { cwd: repoDir })).stdout;
    expect(branchSha).toBe(headSha);

    // Clean up
    await git(["branch", "-D", branchName], { cwd: repoDir, allowFailure: true });
  });

  test("skips creation and returns name when branch already exists", async () => {
    const branchName = implBranchName("test-idempotent-impl", "feat-b");

    // Create the branch manually
    await git(["branch", branchName], { cwd: repoDir });

    // createImplBranch should return the name without error
    const result = await createImplBranch("test-idempotent-impl", "feat-b", { cwd: repoDir });
    expect(result).toBe(branchName);

    // Clean up
    await git(["branch", "-D", branchName], { cwd: repoDir, allowFailure: true });
  });

  test("does not conflict with feature/<slug> worktree branch", async () => {
    // Create a worktree with feature/<slug> branch
    const info = await create("test-no-conflict", { cwd: repoDir });

    // Create an impl branch — should not conflict
    const branchName = await createImplBranch("test-no-conflict", "feat-c", { cwd: repoDir });
    expect(branchName).toBe("impl/test-no-conflict--feat-c");

    // Both branches should coexist
    const featureExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", "refs/heads/feature/test-no-conflict"],
      { cwd: repoDir },
    );
    const implExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`],
      { cwd: repoDir },
    );
    expect(featureExists).toBe(true);
    expect(implExists).toBe(true);

    // Clean up
    await git(["branch", "-D", branchName], { cwd: repoDir, allowFailure: true });
    await remove("test-no-conflict", { cwd: repoDir });
  });
});
```

Update the import to include `createImplBranch`:

```typescript
import { git, gitCheck, create, enter, remove, ensureWorktree, exists, resolveMainBranch, rebase, implBranchName, createImplBranch } from "../git/worktree.js";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun test src/__tests__/worktree.test.ts`
Expected: FAIL — `createImplBranch` is not exported from worktree.ts

- [ ] **Step 3: Implement createImplBranch**

Add to `cli/src/git/worktree.ts`, after the `implBranchName` function:

```typescript
/**
 * Create an implementation branch for a feature.
 * Idempotent — skips creation if the branch already exists.
 * Returns the branch name regardless.
 *
 * Creates the branch from the current HEAD (worktree HEAD when called
 * from a worktree context).
 */
export async function createImplBranch(
  slug: string,
  feature: string,
  opts: { cwd?: string } = {},
): Promise<string> {
  const cwd = opts.cwd;
  const branch = implBranchName(slug, feature);

  // Check if the branch already exists
  const branchExists = await gitCheck(
    ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
    { cwd },
  );

  if (branchExists) {
    return branch;
  }

  // Create from current HEAD
  await git(["branch", branch], { cwd });

  return branch;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun test src/__tests__/worktree.test.ts`
Expected: PASS — all createImplBranch tests green

- [ ] **Step 5: Commit**

```bash
git add cli/src/git/worktree.ts cli/src/__tests__/worktree.test.ts
git commit -m "feat(impl-branch-core): add idempotent createImplBranch"
```

---

### Task 3: Release cleanup — delete impl branches on worktree removal

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/git/worktree.ts`
- Modify: `cli/src/__tests__/worktree.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block to `cli/src/__tests__/worktree.test.ts`:

```typescript
describe("impl branch cleanup on remove", () => {
  test("remove() deletes all impl/<slug>--* branches for the slug", async () => {
    // Create a worktree
    await create("test-cleanup", { cwd: repoDir });

    // Create several impl branches for this slug
    await git(["branch", "impl/test-cleanup--feat-a"], { cwd: repoDir });
    await git(["branch", "impl/test-cleanup--feat-b"], { cwd: repoDir });
    await git(["branch", "impl/test-cleanup--feat-c"], { cwd: repoDir });

    // Also create an impl branch for a DIFFERENT slug (should not be deleted)
    await git(["branch", "impl/other-slug--feat-x"], { cwd: repoDir });

    // Remove the worktree
    await remove("test-cleanup", { cwd: repoDir });

    // All impl branches for test-cleanup should be gone
    const aExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", "refs/heads/impl/test-cleanup--feat-a"],
      { cwd: repoDir },
    );
    const bExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", "refs/heads/impl/test-cleanup--feat-b"],
      { cwd: repoDir },
    );
    const cExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", "refs/heads/impl/test-cleanup--feat-c"],
      { cwd: repoDir },
    );
    expect(aExists).toBe(false);
    expect(bExists).toBe(false);
    expect(cExists).toBe(false);

    // impl branch for other-slug should still exist
    const otherExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", "refs/heads/impl/other-slug--feat-x"],
      { cwd: repoDir },
    );
    expect(otherExists).toBe(true);

    // Clean up the other slug's branch
    await git(["branch", "-D", "impl/other-slug--feat-x"], { cwd: repoDir, allowFailure: true });
  });

  test("remove() succeeds when no impl branches exist", async () => {
    await create("test-cleanup-empty", { cwd: repoDir });

    // Remove without any impl branches — should not error
    await remove("test-cleanup-empty", { cwd: repoDir });

    // Verify worktree is gone
    const wtExists = await exists("test-cleanup-empty", { cwd: repoDir });
    expect(wtExists).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun test src/__tests__/worktree.test.ts`
Expected: FAIL — "remove() deletes all impl/<slug>--* branches" will fail because remove() doesn't currently delete impl branches

- [ ] **Step 3: Extend remove() to clean up impl branches**

Modify the `remove()` function in `cli/src/git/worktree.ts`. Add impl branch cleanup after the worktree is removed and before the optional feature branch deletion:

Replace the current `remove()` function body with:

```typescript
export async function remove(
  slug: string,
  opts: { cwd?: string; deleteBranch?: boolean } = {},
): Promise<void> {
  const cwd = opts.cwd;
  const branch = `feature/${slug}`;
  const wtPath = `${WORKTREE_DIR}/${slug}`;

  // Remove the worktree (force to handle uncommitted changes)
  await git(["worktree", "remove", wtPath, "--force"], {
    cwd,
    allowFailure: true,
  });

  // Prune to clean up
  await git(["worktree", "prune"], { cwd, allowFailure: true });

  // Delete all impl branches for this slug (impl/<slug>--*)
  const implPrefix = `impl/${slug}--`;
  const branchList = await git(["branch", "--list", `${implPrefix}*`], {
    cwd,
    allowFailure: true,
  });
  if (branchList.exitCode === 0 && branchList.stdout.trim()) {
    const implBranches = branchList.stdout
      .split("\n")
      .map((b) => b.trim().replace(/^\*\s*/, ""))
      .filter((b) => b.length > 0);
    for (const b of implBranches) {
      await git(["branch", "-D", b], { cwd, allowFailure: true });
    }
  }

  // Optionally delete the feature branch
  if (opts.deleteBranch !== false) {
    await git(["branch", "-D", branch], { cwd, allowFailure: true });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun test src/__tests__/worktree.test.ts`
Expected: PASS — all cleanup tests green

- [ ] **Step 5: Commit**

```bash
git add cli/src/git/worktree.ts cli/src/__tests__/worktree.test.ts
git commit -m "feat(impl-branch-core): delete impl branches on worktree removal"
```

---

### Task 4: Watch loop dispatch integration

**Wave:** 2
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/commands/watch-loop.ts`

- [ ] **Step 1: Add import for createImplBranch**

At the top of `cli/src/commands/watch-loop.ts`, add to the imports:

```typescript
import { createImplBranch } from "../git/worktree.js";
```

- [ ] **Step 2: Call createImplBranch before session dispatch in dispatchFanOut**

In the `dispatchFanOut` method, add the `createImplBranch` call after the tracker reserve and before the session factory create. Locate the block starting with `this.tracker.reserve(epic.slug, "implement", featureSlug);` and the `try` block that follows. Insert the branch creation call inside the try block, before `this.deps.sessionFactory.create(...)`:

The modified section should look like:

```typescript
      try {
        // Create impl branch before dispatch — idempotent, skips if exists
        await createImplBranch(epic.slug, featureSlug, {
          cwd: resolve(this.config.projectRoot, ".claude", "worktrees", epic.slug),
        });

        const handle = await this.deps.sessionFactory.create({
```

- [ ] **Step 3: Verify no type errors**

Run: `cd cli && bun x tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/watch-loop.ts
git commit -m "feat(impl-branch-core): create impl branch in watch loop before dispatch"
```

---

### Task 5: Pipeline runner dispatch integration

**Wave:** 2
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/pipeline/runner.ts`

- [ ] **Step 1: Add import for createImplBranch**

At the top of `cli/src/pipeline/runner.ts`, add `createImplBranch` to the existing worktree import:

```typescript
import * as worktree from "../git/worktree.js";
import { rebase, createImplBranch } from "../git/worktree.js";
```

- [ ] **Step 2: Call createImplBranch before dispatch when phase is implement**

In the `run()` function, just before `// -- Step 4: dispatch.run ---` (the dispatch step), add:

```typescript
  // Create impl branch for implement phase (idempotent — skips if exists)
  if (config.phase === "implement" && config.featureSlug) {
    try {
      const implBranch = await createImplBranch(config.epicSlug, config.featureSlug, { cwd: worktreePath });
      logger.log(`impl branch: ${implBranch}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`impl branch creation failed: ${message}`);
    }
  }
```

- [ ] **Step 3: Verify no type errors**

Run: `cd cli && bun x tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add cli/src/pipeline/runner.ts
git commit -m "feat(impl-branch-core): create impl branch in pipeline runner before dispatch"
```

---

### Task 6: Full test suite verification

**Wave:** 3
**Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5

**Files:**
- Test: `cli/src/__tests__/worktree.test.ts` (read-only verification)

- [ ] **Step 1: Run the full test suite**

Run: `cd cli && bash scripts/test.sh`
Expected: ALL test files pass

- [ ] **Step 2: Run typecheck**

Run: `cd cli && bun x tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Verify acceptance criteria**

Manually verify each acceptance criterion by reading the code:

1. `implBranchName("abc123", "my-feature")` returns `"impl/abc123--my-feature"` — verified in tests
2. `createImplBranch()` creates the branch from HEAD when it doesn't exist — verified in tests
3. `createImplBranch()` skips creation when branch already exists — verified in tests
4. Watch loop calls `createImplBranch()` before dispatch — in `dispatchFanOut()` before `sessionFactory.create()`
5. Pipeline runner calls `createImplBranch()` before dispatch — in `run()` before dispatch step
6. Both paths use the same `createImplBranch()` function — same import from `git/worktree.ts`
7. Worktree removal deletes `impl/<slug>--*` branches — in `remove()` function
8. `impl/<slug>--<feature>` doesn't conflict with `feature/<slug>` — verified in tests
9. All new functions have tests — verified
