# Squash Per Release Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** One squashed commit per release version on main — both going forward and retroactively.

**Architecture:** Change `/release` to use `git merge --squash` with archive tagging, then run a one-time script to rewrite main's history into one commit per version tag.

**Tech Stack:** Git (merge --squash, filter-branch alternative via commit-tree), Bash scripting

**Design Doc:** `.beastmode/state/design/2026-03-05-squash-per-release.md`

---

### Task 0: Update worktree-manager.md — squash merge + archive tagging

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/_shared/worktree-manager.md:84-97`

**Step 1: Replace Option 1 (Merge Locally) with squash merge + archive tag**

Replace lines 84-97 of `skills/_shared/worktree-manager.md` — the "Option 1: Merge Locally" section:

```markdown
### Option 1: Merge Locally

```bash
worktree_abs=$(pwd)
feature_branch=$(git branch --show-current)
main_repo=$(git rev-parse --show-toplevel)/..

# Archive the branch tip before squash merge
cd "$main_repo"
git checkout main
git pull
git tag "archive/$feature_branch"
git merge --squash "$feature_branch"
# Do NOT commit here — the release skill's commit step handles the message
```

After the squash merge stages changes, the release commit step (1-execute step 9) creates the single commit with the GitHub release style message.

Cleanup after commit:
```bash
git worktree remove "$worktree_abs"
git branch -d "$feature_branch"
# Remote cleanup (if branch was pushed)
git push origin --delete "$feature_branch" 2>/dev/null || true
```
```

**Step 2: Verify**

Run: `grep -n "merge --squash" skills/_shared/worktree-manager.md`
Expected: Match on the new line in Option 1.

Run: `grep -n "archive/" skills/_shared/worktree-manager.md`
Expected: Match showing archive tag creation.

---

### Task 1: Update release 1-execute.md — merge commit message format + step consolidation

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/1-execute.md:11-19`
- Modify: `skills/release/phases/1-execute.md:146-163`

**Step 1: Remove WIP commit step**

Replace step 2 (lines 11-22) — the "WIP Commit" section. Since we're now doing a squash merge, there's no need for a WIP commit on the feature branch. The squash merge will pick up all uncommitted changes. Replace with:

```markdown
## 2. Stage Uncommitted Changes

Stage all uncommitted changes from implement/validate phases so they're included in the squash merge.

```bash
git add -A
```

Report: "All changes staged. Ready for release."
```

**Step 2: Update step 9 (Commit Release Changes) to use GitHub release style**

Replace the current step 9 (lines 146-159) with:

```markdown
## 9. Commit Squash Merge

After the squash merge in step 10 stages all branch changes onto main, create the single commit with GitHub release style message:

```bash
git commit -m "Release vX.Y.Z — <Title from CHANGELOG>

## Features
- <feature 1>
- <feature 2>

## Fixes
- <fix 1>

## Artifacts
- Design: .beastmode/state/design/YYYY-MM-DD-<feature>.md
- Plan: .beastmode/state/plan/YYYY-MM-DD-<feature>.md
- Release: .beastmode/state/release/YYYY-MM-DD-vX.Y.Z.md
"
```

Use the release notes generated in step 5 as the commit body. Omit empty sections.
```

**Step 3: Update step 10 to reference squash merge**

Replace step 10 (lines 161-163):

```markdown
## 10. Squash Merge and Cleanup

@../_shared/worktree-manager.md#Merge Options

**Important:** For "Merge locally", the squash merge stages changes but does NOT commit. Return to step 9 to create the commit with the release message, then proceed with cleanup.
```

**Step 4: Verify**

Run: `grep -n "WIP" skills/release/phases/1-execute.md`
Expected: 0 matches (WIP commit removed).

Run: `grep -n "Release vX.Y.Z" skills/release/phases/1-execute.md`
Expected: Match in step 9 showing new commit format.

---

### Task 2: Reorder release steps — merge before commit

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `skills/release/phases/1-execute.md`

**Step 1: Swap steps 9 and 10**

The squash merge must happen BEFORE the commit. Reorder so:
- Step 9 = Squash Merge and Cleanup (was step 10) — stages squashed changes on main
- Step 10 = Commit Release (was step 9) — creates the single commit with release message
- Step 11 = Git Tagging (was step 11) — unchanged
- Step 12 = Plugin Marketplace Update (was step 12) — unchanged

Read the full file, then rewrite steps 9-10 with correct ordering:

```markdown
## 9. Squash Merge to Main

@../_shared/worktree-manager.md#Merge Options

**Important:** For "Merge locally", the squash merge stages changes but does NOT commit. Proceed to step 10 to create the commit.

## 10. Commit Release

Create the single commit with GitHub release style message:

```bash
git add -A
git commit -m "Release vX.Y.Z — <Title from CHANGELOG>

## Features
- <feature 1>
- <feature 2>

## Fixes
- <fix 1>

## Artifacts
- Design: .beastmode/state/design/YYYY-MM-DD-<feature>.md
- Plan: .beastmode/state/plan/YYYY-MM-DD-<feature>.md
- Release: .beastmode/state/release/YYYY-MM-DD-vX.Y.Z.md
"
```

Use the release notes generated in step 5 and categorized commits from step 4 as the commit body. Omit empty sections (no Fixes if none exist).
```

**Step 2: Verify**

Read `skills/release/phases/1-execute.md` and confirm step 9 is merge, step 10 is commit, step 11 is tag.

---

### Task 3: Write retroactive rewrite script

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `scripts/squash-history.sh`

**Step 1: Create the scripts directory**

```bash
mkdir -p scripts
```

**Step 2: Write the rewrite script**

Create `scripts/squash-history.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Squash History — One commit per version tag
#
# Rebuilds main as a linear sequence of squashed commits,
# one per version tag. Archives existing feature branches.
#
# Usage: bash scripts/squash-history.sh [--dry-run]
#
# DESTRUCTIVE: Requires force push after running.

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== DRY RUN — no changes will be made ==="
fi

# Ensure we're on main and clean
current_branch=$(git branch --show-current)
if [[ "$current_branch" != "main" ]]; then
  echo "Error: Must be on main branch. Currently on: $current_branch"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: Working directory not clean. Commit or stash changes first."
  exit 1
fi

# Collect version tags sorted by version
mapfile -t TAGS < <(git tag -l 'v*' --sort=version:refname)
echo "Found ${#TAGS[@]} version tags: ${TAGS[*]}"

# Archive existing feature branches
echo ""
echo "=== Archiving feature branches ==="
for branch in $(git branch -r --list 'origin/feature/*' | sed 's|origin/||'); do
  archive_tag="archive/$branch"
  if git rev-parse "$archive_tag" >/dev/null 2>&1; then
    echo "  Skip: $archive_tag already exists"
  else
    if $DRY_RUN; then
      echo "  Would archive: $branch → $archive_tag"
    else
      git tag "$archive_tag" "origin/$branch"
      echo "  Archived: $branch → $archive_tag"
    fi
  fi
done

# Also archive local feature branches
for branch in $(git branch --list 'feature/*' | sed 's/^[* ]*//' ); do
  archive_tag="archive/$branch"
  if git rev-parse "$archive_tag" >/dev/null 2>&1; then
    echo "  Skip: $archive_tag already exists"
  else
    if $DRY_RUN; then
      echo "  Would archive: $branch → $archive_tag"
    else
      git tag "$archive_tag" "$branch"
      echo "  Archived: $branch → $archive_tag"
    fi
  fi
done

if $DRY_RUN; then
  echo ""
  echo "=== DRY RUN — would create ${#TAGS[@]} squashed commits ==="
  for tag in "${TAGS[@]}"; do
    echo "  $tag"
  done
  echo ""
  echo "Run without --dry-run to execute."
  exit 0
fi

# Build new linear history
echo ""
echo "=== Building squashed history ==="

# Read CHANGELOG.md for commit messages
CHANGELOG="CHANGELOG.md"

parent=""
for tag in "${TAGS[@]}"; do
  # Get tree at this tag
  tree=$(git rev-parse "$tag^{tree}")

  # Extract title from CHANGELOG (e.g., "### v0.10.0 — The Visible Gate (Mar 2026)")
  title=$(grep -m1 "### $tag " "$CHANGELOG" 2>/dev/null | sed 's/^### //' | sed 's/ (.*)//' || echo "$tag")

  # Extract body (lines between this version header and the next ### or ---)
  body=$(awk "/^### $tag /{found=1; next} /^### v|^---/{if(found) exit} found{print}" "$CHANGELOG" 2>/dev/null || echo "")

  # Build commit message
  msg="Release $title"
  if [[ -n "$body" ]]; then
    msg="$msg

## Changes
$body"
  fi

  # Create commit
  if [[ -z "$parent" ]]; then
    # First commit — no parent
    new_commit=$(git commit-tree "$tree" -m "$msg")
  else
    new_commit=$(git commit-tree "$tree" -p "$parent" -m "$msg")
  fi

  echo "  $tag → $(echo "$new_commit" | head -c 7) — $title"
  parent="$new_commit"
done

# Point main at the new history
echo ""
echo "=== Updating main ==="
git update-ref refs/heads/main "$parent"
git checkout main

# Move version tags to new commits
echo ""
echo "=== Relocating version tags ==="
parent=""
for tag in "${TAGS[@]}"; do
  tree=$(git rev-parse "$tag^{tree}")

  # Find the new commit with this tree
  new_commit=$(git log --format='%H %T' main | grep " $tree$" | head -1 | cut -d' ' -f1)

  if [[ -n "$new_commit" ]]; then
    git tag -f "$tag" "$new_commit"
    echo "  $tag → $(echo "$new_commit" | head -c 7)"
  else
    echo "  WARNING: Could not find new commit for $tag"
  fi
done

echo ""
echo "=== Done ==="
echo "Review with: git log --oneline main"
echo ""
echo "When satisfied, push with:"
echo "  git push --force origin main"
echo "  git push --force --tags origin"
```

**Step 3: Make executable**

```bash
chmod +x scripts/squash-history.sh
```

**Step 4: Verify**

Run: `bash scripts/squash-history.sh --dry-run`
Expected: Lists all version tags and says "would create N squashed commits" without making changes.

---

### Task 4: Update architecture docs

**Wave:** 3
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `.beastmode/context/design/architecture.md`
- Modify: `.beastmode/context/implement/agents.md`

**Step 1: Update architecture.md — Unified Cycle Commits decision**

Find the "Unified Cycle Commit Architecture" key decision and update it:

Replace:
```markdown
**Unified Cycle Commit Architecture:**
- Context: Multiple phase-specific commits per feature cycle create noise; worktree isolation enables consolidation
- Decision: Design creates worktree, all phases write artifacts without committing, Release owns single commit + merge + cleanup
- Rationale: Reduces commit noise; maintains WIP safety via worktree isolation; clear endpoint for merge/cleanup logic; single commit simplifies history
```

With:
```markdown
**Squash-Per-Release Commit Architecture:**
- Context: Multiple phase-specific commits per feature cycle create noise on main; branch history leaks via regular merge
- Decision: Release uses `git merge --squash` to collapse entire feature branch into one commit on main. Feature branch tips archived as `archive/feature/<name>` tags before deletion.
- Rationale: One commit per version on main; full branch history preserved via archive tags; GitHub release style commit messages make `git log` scannable
```

**Step 2: Update agents.md — add archive tag convention**

Add to the "Feature Workflow" section after "Release owns merge":

```markdown
- **Archive tagging**: Before squash merge, feature branch tip tagged as `archive/feature/<feature>` for future reference
- **Squash merge**: `git merge --squash` collapses branch history into one commit on main
```

**Step 3: Verify**

Run: `grep -n "squash" .beastmode/context/design/architecture.md`
Expected: Match in the updated key decision.

Run: `grep -n "archive" .beastmode/context/implement/agents.md`
Expected: Match in the feature workflow section.
