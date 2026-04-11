# Remove Dead Merge — Tasks

## Goal

Remove the dead `merge()` function from `cli/src/git/worktree.ts` and update the module docstring to no longer list `merge` as a lifecycle operation. No callers exist.

## Architecture

- Single file change: `cli/src/git/worktree.ts`
- `merge()` at lines 393-412 (JSDoc + function body)
- Module docstring at lines 52-65 lists `merge` — remove the two mentions
- `archive()` at lines 375-391 must remain untouched

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/git/worktree.ts` | Modify | Remove `merge()` function and docstring references |

## Tasks

### Task 1: Remove merge function and docstring references

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/git/worktree.ts:52-65` (docstring)
- Modify: `cli/src/git/worktree.ts:393-412` (merge function)

- [x] **Step 1: Delete the merge() function**

Delete lines 393-412 from `cli/src/git/worktree.ts` — the JSDoc comment and the entire `merge()` function:

```typescript
/**
 * Squash-merge a feature branch into main.
 */
export async function merge(
  slug: string,
  opts: { cwd?: string } = {},
): Promise<void> {
  const cwd = opts.cwd;
  const branch = `feature/${slug}`;
  const mainBranch = await resolveMainBranch({ cwd });

  // Squash-merge into main (from project root, not worktree)
  await git(["checkout", mainBranch], { cwd });
  // Reset staged changes and remove untracked artifacts that could conflict
  await git(["reset", "HEAD"], { cwd, allowFailure: true });
  await git(["checkout", "."], { cwd, allowFailure: true });
  await git(["clean", "-fd", ".beastmode/artifacts/"], { cwd, allowFailure: true });
  await git(["merge", "--squash", branch], { cwd });
  await git(["commit", "--no-edit"], { cwd, allowFailure: true });
}
```

- [x] **Step 2: Update the module docstring — first line**

Change line 53 from:
```
 * Worktree lifecycle manager — create, enter, exists, archive, merge, remove.
```
to:
```
 * Worktree lifecycle manager — create, enter, exists, archive, remove.
```

- [x] **Step 3: Update the module docstring — operations list**

Delete line 61 from the operations list:
```
 *   merge         — squash-merge feature branch into main
```

- [x] **Step 4: Run tests to verify nothing breaks**

Run: `cd cli && npx vitest run src/__tests__/worktree.test.ts 2>&1 | tail -20`
Expected: PASS — no tests reference the `merge()` function

- [x] **Step 5: Verify archive() is untouched**

Run: `grep -n "export async function archive" cli/src/git/worktree.ts`
Expected: `archive` function still present

- [x] **Step 6: Verify merge() is gone**

Run: `grep -n "export async function merge" cli/src/git/worktree.ts`
Expected: No output (function deleted)

- [x] **Step 7: Commit**

```bash
git add cli/src/git/worktree.ts
git commit -m "refactor(worktree): remove dead merge() function"
```
