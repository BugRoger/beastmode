# Rebase Before Squash — Implementation Tasks

## Goal

Rewrite the release skill's "Squash Merge to Main" step (Checkpoint step 3) to insert a rebase of the feature branch onto main before the squash merge. Remove the `--theirs` conflict resolution rules for code files and `.beastmode/` files. Remove the dead `merge()` function from `cli/src/git/worktree.ts`.

## Architecture

- The release skill is a markdown instruction file at `skills/release/SKILL.md` — LLM-executed, not CLI code
- The dead `merge()` function lives in `cli/src/git/worktree.ts` (lines 393-412) — no active callers
- Archive tag must be created before rebase to preserve pre-rebase commit history
- `--ours` resolution for CHANGELOG.md and version files is preserved
- Post-rebase, code file conflicts during squash merge should fail loudly

## Tech Stack

- Markdown (skill instructions)
- TypeScript (CLI dead code removal)

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `skills/release/SKILL.md` | Modify | Rewrite step 3 sequence, update conflict rules, update constraints |
| `cli/src/git/worktree.ts` | Modify | Remove dead `merge()` function and its JSDoc |

---

### Task 1: Rewrite Release Skill Step 3

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/SKILL.md:178-200`

- [x] **Step 1: Rewrite "Squash Merge to Main" section**

Replace the entire `### 3. Squash Merge to Main` section (lines 179-200) with the new sequence that includes rebase:

```markdown
### 3. Squash Merge to Main

```bash
feature_dir=$(pwd)
feature_branch=$(git branch --show-current)
main_repo=$(git rev-parse --show-toplevel)/..

# Navigate to main repo, checkout main, pull latest
cd "$main_repo"
git checkout main
git pull

# Archive tag BEFORE rebase — preserves original pre-rebase commit history
git tag "archive/$feature_branch"

# Navigate back to feature worktree for rebase
cd "$feature_dir"
git rebase main
```

If the rebase encounters conflicts, resolve them interactively per commit:
1. Examine each conflicted file
2. Resolve the conflict (edit the file to produce the correct merged content)
3. `git add <resolved-file>`
4. `git rebase --continue`
5. Repeat until rebase completes

After rebase completes:

```bash
# Navigate back to main repo for squash merge
cd "$main_repo"
git merge --squash "$feature_branch"
```

**Important:** The squash merge stages changes but does NOT commit. Proceed to step 4.

If the squash merge produces conflicts after rebase, resolve as follows:

- **CHANGELOG.md**: resolve with `--ours` (main has the complete history; new entry is added in step 5)
- **Version files** (plugin.json, marketplace.json): resolve with `--ours` (main has the correct current version; bump happens in step 6)
- **All other files**: any remaining conflicts after rebase indicate genuine divergence — fail loudly and report for manual review. Do NOT auto-resolve with `--theirs`.
```

- [x] **Step 2: Update Constraints section**

Add a new constraint to the Constraints section (after "NEVER skip the archive tag before squash merge"):

```markdown
- ALWAYS rebase the feature branch onto main before squash merge — prevents stale fork point from overwriting intermediate main commits
- After rebase, code file conflicts during squash merge are genuine divergence — do NOT auto-resolve with `--theirs`
```

- [x] **Step 3: Verify acceptance criteria in the modified file**

Read the modified `skills/release/SKILL.md` and verify:
1. Step 3 includes `git rebase main` after archive tag and before squash merge
2. Archive tag is created before the rebase
3. No `--theirs` conflict resolution rule exists for code files or .beastmode/ files
4. `--ours` resolution for CHANGELOG.md and version files is preserved
5. Rebase conflict handling instructions are present
6. Step 3 sequence: checkout main → pull → tag archive → (back to worktree) → rebase main → (back to main repo) → merge --squash

- [x] **Step 4: Commit**

```bash
git add skills/release/SKILL.md
git commit -m "feat(release): rebase feature branch onto main before squash merge"
```

---

### Task 2: Remove Dead merge() Function

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/git/worktree.ts:393-412`

- [x] **Step 1: Verify no callers of merge()**

Grep the codebase for any imports or calls to the `merge` function from worktree:

```bash
grep -r "merge" --include="*.ts" --include="*.tsx" -l | xargs grep -l "from.*worktree\|worktree.*merge" 2>/dev/null
```

Expected: no active callers (only design docs reference it).

- [x] **Step 2: Remove the merge() function**

Delete lines 393-412 from `cli/src/git/worktree.ts` — the JSDoc comment and the entire `export async function merge(...)` function body.

Also update the module-level JSDoc comment (line 53) to remove "merge" from the lifecycle list:

Before: `Worktree lifecycle manager — create, enter, exists, archive, merge, remove.`
After: `Worktree lifecycle manager — create, enter, exists, archive, remove.`

And line 61:
Before: `*   merge         — squash-merge feature branch into main`
After: (delete this line)

- [x] **Step 3: Run existing tests to verify nothing breaks**

```bash
cd cli && bun test 2>&1 | tail -20
```

Expected: all existing tests pass.

- [x] **Step 4: Commit**

```bash
git add cli/src/git/worktree.ts
git commit -m "chore(cli): remove dead merge() function from worktree.ts"
```
