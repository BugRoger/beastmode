# Unified Cycle Commit Implementation Plan

**Goal:** Consolidate all phase commits (design, plan, implement, retro, release) into a single commit per feature cycle using shared worktree isolation.

**Architecture:** /design creates a worktree at `.agents/worktrees/cycle/<topic>` and records its path in the status file. All subsequent phases (/plan, /implement, /retro) inherit this worktree by reading the status file. /release commits all changes, merges, and cleans up. No interim commits.

**Tech Stack:** Git worktrees, markdown skill phases, bash

**Design Doc:** [.agents/design/2026-03-01-unified-cycle-commit.md](../design/2026-03-01-unified-cycle-commit.md)

---

## Task 0: Add Worktree Helper Utility

**Files:**
- Create: `skills/_shared/worktree-manager.md`

**Step 1: Create the shared utility**

```markdown
# Worktree Manager

## Read Worktree from Status

```bash
get_worktree_path() {
  local status_file="$1"
  grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`'
}
```

## Worktree Section Format

Add to status file after `## Context`:

```markdown
## Worktree
- **Path**: `.agents/worktrees/cycle/<topic>`
- **Branch**: `cycle/<topic>`
```

## Create Worktree

```bash
create_cycle_worktree() {
  local topic="$1"
  local path=".agents/worktrees/cycle/$topic"
  local branch="cycle/$topic"

  mkdir -p .agents/worktrees/cycle
  git check-ignore -q .agents/worktrees 2>/dev/null || {
    echo ".agents/worktrees/" >> .gitignore
  }
  git worktree add "$path" -b "$branch"
  echo "$path"
}
```

## Verify Worktree Exists

```bash
verify_worktree() {
  local path="$1"
  if [ ! -d "$path" ]; then
    echo "Error: Worktree at $path not found"
    return 1
  fi
}
```

## Remove Worktree Section

After merge/cleanup, remove `## Worktree` section from status file.
```

**Step 2: Verify file created**

Run: `cat skills/_shared/worktree-manager.md | head -20`
Expected: File contents showing "# Worktree Manager"

---

## Task 1: Update /design Phase 1 — Create Worktree

**Files:**
- Modify: `skills/design/phases/1-explore.md`

**Step 1: Add worktree creation section after step 2**

Insert after "## 2. Check Project State":

```markdown
## 3. Create Cycle Worktree

Create isolated worktree for the entire feature cycle:

```bash
# Extract topic from arguments or user input
topic="<topic-name>"

# Create worktree
mkdir -p .agents/worktrees/cycle
path=".agents/worktrees/cycle/$topic"
branch="cycle/$topic"

# Verify worktree dir is gitignored
git check-ignore -q .agents/worktrees 2>/dev/null || {
  echo ".agents/worktrees/" >> .gitignore
  git add .gitignore
  git commit -m "chore: ignore .agents/worktrees/"
}

# Create worktree with new branch
git worktree add "$path" -b "$branch"
cd "$path"
```

Report: "Created worktree at `$path` on branch `$branch`"
```

**Step 2: Renumber subsequent sections**

Change "## 3. Ask Clarifying Questions" to "## 4. Ask Clarifying Questions"
Change "## 4. Create Tasks" to "## 5. Create Tasks"

**Step 3: Verify changes**

Run: `grep -n "^## " skills/design/phases/1-explore.md`
Expected: Sections numbered 1-5

---

## Task 2: Update /design Phase 3 — Remove Commit, Add Worktree to Status

**Files:**
- Modify: `skills/design/phases/3-document.md`

**Step 1: Remove the commit section**

Delete lines 14-19:

```markdown
## 2. Commit

```bash
git add .agents/design/YYYY-MM-DD-<topic>.md
git commit -m "docs(design): add <topic> design"
```
```

**Step 2: Add worktree section to session tracking**

Replace the removed commit section with:

```markdown
## 2. Update Status with Worktree

When updating the status file, add `## Worktree` section after `## Context`:

```markdown
## Worktree
- **Path**: `.agents/worktrees/cycle/<topic>`
- **Branch**: `cycle/<topic>`
```

**Do NOT commit.** Worktree provides WIP safety.
```

**Step 3: Renumber remaining sections**

Update "## 3. Suggest Next Step" to "## 3. Suggest Next Step" (stays same)
Update "## 4. Session Tracking" to "## 4. Session Tracking" (stays same)
Update "## 5. Context Report" to "## 5. Context Report" (stays same)

**Step 4: Verify no git commit in file**

Run: `grep -c "git commit" skills/design/phases/3-document.md`
Expected: 0

---

## Task 3: Update /plan Phase 1 — Read Worktree from Status

**Files:**
- Modify: `skills/plan/phases/1-prepare.md`

**Step 1: Add worktree lookup after step 3**

Insert after "## 3. Read Design Document":

```markdown
## 4. Enter Cycle Worktree

Read worktree path from status file and change into it:

```bash
# Find status file matching design doc date
status_file=".agents/status/YYYY-MM-DD-<topic>.md"

# Extract worktree path
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')

# Verify and enter
if [ -z "$worktree_path" ]; then
  echo "Error: No active cycle. Run /design first"
  exit 1
fi

if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree at $worktree_path not found"
  exit 1
fi

cd "$worktree_path"
```

Report: "Working in cycle worktree at `$worktree_path`"
```

**Step 2: Renumber step 4**

Change "## 4. Explore Codebase" to "## 5. Explore Codebase"

**Step 3: Verify changes**

Run: `grep -n "^## " skills/plan/phases/1-prepare.md`
Expected: Sections numbered 1-5

---

## Task 4: Update /plan — Remove Commit References

**Files:**
- Modify: `skills/plan/references/task-format.md`

**Step 1: Remove commit step from task template**

In the task template (lines 46-52), replace the commit step with a note:

Before:
```markdown
**Step 5: Commit**

\`\`\`bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
\`\`\`
```

After:
```markdown
**Step 5: Verify**

Run all related tests to confirm nothing broke.
No commit needed — unified commit at /release.
```

**Step 2: Update "Remember" section**

Change line 61 from:
```markdown
- DRY, YAGNI, TDD, frequent commits
```
To:
```markdown
- DRY, YAGNI, TDD (commits at /release only)
```

**Step 3: Verify changes**

Run: `grep -c "git commit" skills/plan/references/task-format.md`
Expected: 0

---

## Task 5: Update /implement Phase 1 — Use Existing Worktree

**Files:**
- Modify: `skills/implement/phases/1-setup.md`

**Step 1: Replace worktree creation with worktree lookup**

Replace the entire "## Directory Selection Process" and "## Creation Steps" sections with:

```markdown
## 1. Read Worktree from Status

The cycle worktree was created by /design. Read its location:

```bash
# Find status file from plan filename
# Plan: .agents/plan/YYYY-MM-DD-<topic>.md
# Status: .agents/status/YYYY-MM-DD-<topic>.md
status_file=".agents/status/YYYY-MM-DD-<topic>.md"

# Extract worktree path
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')

# Verify
if [ -z "$worktree_path" ]; then
  echo "Error: No active cycle. Run /design first"
  exit 1
fi

if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree at $worktree_path not found"
  exit 1
fi

cd "$worktree_path"
```

## 2. Report Location

```
Using existing cycle worktree at <full-path>
Branch: <branch-name>
Ready for Phase 2: Prepare
```
```

**Step 2: Remove worktree creation code**

Delete sections:
- "## Directory Selection Process" (lines ~13-38)
- "## Safety Verification" (lines ~40-57)
- "## Creation Steps" (lines ~59-92)

**Step 3: Simplify exit criteria**

Replace exit criteria with:

```markdown
## Exit Criteria

✓ Worktree found from status file
✓ Changed into worktree directory
✓ Branch confirmed: `cycle/<topic>`

**On success:** Proceed to Phase 2: Prepare
**On failure:** Error with "Run /design first" message
```

**Step 4: Verify no worktree creation**

Run: `grep -c "git worktree add" skills/implement/phases/1-setup.md`
Expected: 0

---

## Task 6: Update /implement Phase 4 — Remove Merge, Suggest /retro

**Files:**
- Modify: `skills/implement/phases/4-complete.md`

**Step 1: Simplify to just verify completion**

Replace entire file with:

```markdown
# 4. Complete

## Overview

Verify all tasks are complete and suggest next phase.

**Core principle:** Implementation done → /retro for learnings → /release for commit.

**Announce at start:** "Verifying implementation completeness."

## Step 1: Verify All Tasks Complete

Check that all tasks from the plan are marked complete:

```bash
# Check task file
cat .agents/plan/YYYY-MM-DD-<topic>.tasks.json | jq '.tasks[] | select(.status != "completed")'
```

**If incomplete tasks exist:** List them and ask user how to proceed.

## Step 2: Run Final Verification

```bash
# Run project tests
<project-specific-test-command>

# Verify no uncommitted changes would break on main
git status
```

## Step 3: Suggest Next Step

```
Implementation complete!

No commit yet — all changes will be committed together at /release.

Recommended next step:
/retro

This will review the session and capture learnings before release.
```

**Do NOT:**
- Commit any changes
- Merge branches
- Clean up worktree
- Present merge options

All of that happens in /release.

## Exit Criteria

✓ All plan tasks marked complete
✓ Tests passing
✓ Suggested /retro as next step

**On success:** Wait for user to invoke /retro
**On failure:** Help user complete remaining tasks

## 4. Session Tracking

@../_shared/session-tracking.md

## 5. Context Report

@../_shared/context-report.md
```

**Step 2: Verify simplified structure**

Run: `wc -l skills/implement/phases/4-complete.md`
Expected: ~70 lines (down from ~270)

---

## Task 7: Update /retro Phase 3 — Remove Commit, Suggest /release

**Files:**
- Modify: `skills/retro/phases/3-apply.md`

**Step 1: Add worktree lookup at start**

Insert after "# 3. Apply Changes":

```markdown
## 0. Enter Cycle Worktree

Read worktree from most recent status file and change into it:

```bash
# Find most recent status file
status_file=$(ls -t .agents/status/*.md 2>/dev/null | head -1)

# Extract worktree path
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')

if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
  cd "$worktree_path"
fi
```
```

**Step 2: Remove commit section**

Delete lines 18-24:

```markdown
## 4. Commit

```bash
git add .agents/prime/
git add .agents/CLAUDE.md
git commit -m "docs(retro): update prime docs from session learnings"
```
```

**Step 3: Replace with /release suggestion**

Add in place of commit section:

```markdown
## 4. Suggest Next Step

```
Prime docs updated!

No commit yet — all changes will be committed together at /release.

Ready to ship?
/release
```

**Do NOT commit.** Unified commit at /release.
```

**Step 4: Renumber remaining sections**

- "## 5. Session Tracking" stays
- "## 6. Context Report" stays

**Step 5: Verify no git commit**

Run: `grep -c "git commit" skills/retro/phases/3-apply.md`
Expected: 0

---

## Task 8: Update /release Phase 3 — Full Cycle Commit + Merge

**Files:**
- Modify: `skills/release/phases/3-publish.md`

**Step 1: Replace entire file with expanded version**

```markdown
# 3. Publish

## Overview

Commit all cycle changes, merge to main, cleanup worktree.

**Core principle:** Single commit → Merge options → Cleanup.

## 1. Read Worktree Info

```bash
# Find status file
status_file=$(ls -t .agents/status/*.md 2>/dev/null | head -1)

# Extract worktree path and branch
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')
worktree_branch=$(grep -A2 "^## Worktree" "$status_file" | grep "Branch:" | sed 's/.*Branch:\s*//' | tr -d '`')

# Change into worktree
if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
  cd "$worktree_path"
fi
```

## 2. Stage All Changes

```bash
# Stage everything: code + .agents/ artifacts + changelog
git add -A
```

## 3. Create Single Commit

Extract topic from status file and create unified commit:

```bash
# Extract topic from status filename
topic=$(basename "$status_file" .md | sed 's/^[0-9-]*//')

git commit -m "$(cat <<'EOF'
feat(<topic>): <summary-from-changelog>

Cycle artifacts:
- Design: .agents/design/YYYY-MM-DD-<topic>.md
- Plan: .agents/plan/YYYY-MM-DD-<topic>.md
- Release: .agents/release/YYYY-MM-DD-<version>.md
EOF
)"
```

## 4. Present Merge Options

```yaml
AskUserQuestion:
  question: "Release committed. How should I proceed?"
  header: "Merge"
  options:
    - label: "Merge locally (Recommended)"
      description: "Merge to main, delete worktree and branch"
    - label: "Push and create PR"
      description: "Push branch, create PR, keep worktree"
    - label: "Keep as-is"
      description: "I'll handle merge later"
    - label: "Discard"
      description: "Delete branch and worktree (requires confirmation)"
```

## 5. Execute Choice

### Option 1: Merge Locally

```bash
# Save current info
worktree_abs=$(pwd)
feature_branch=$(git branch --show-current)
base_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
base_branch=${base_branch:-main}

# Go to main repo
cd "$(git rev-parse --show-toplevel)/.."
git checkout "$base_branch"
git pull

# Merge
git merge "$feature_branch"

# Cleanup
git worktree remove "$worktree_abs"
git branch -d "$feature_branch"
```

### Option 2: Push and Create PR

```bash
git push -u origin "$feature_branch"

gh pr create --title "feat(<topic>): <summary>" --body "$(cat <<'EOF'
## Summary
<from changelog>

## Cycle Artifacts
- Design: .agents/design/YYYY-MM-DD-<topic>.md
- Plan: .agents/plan/YYYY-MM-DD-<topic>.md

Generated by beastmode
EOF
)"
```

Keep worktree for PR feedback.

### Option 3: Keep As-Is

```
Branch: <branch>
Worktree: <path>

When ready:
- Merge: git checkout main && git merge <branch>
- Cleanup: git worktree remove <path> && git branch -d <branch>
```

### Option 4: Discard

Require typed "discard" confirmation, then:

```bash
cd "$(git rev-parse --show-toplevel)/.."
git checkout "$base_branch"
git worktree remove "$worktree_abs" --force
git branch -D "$feature_branch"
```

## 6. Remove Worktree from Status

For merge/discard, remove `## Worktree` section from status file.

## 7. Suggest Git Tag

```bash
git tag -a v<version> -m "Release <version>"
git push origin v<version>
```

## 8. Session Tracking

@../_shared/session-tracking.md

## 9. Context Report

@../_shared/context-report.md
```

**Step 2: Verify expanded structure**

Run: `grep -c "^## " skills/release/phases/3-publish.md`
Expected: 9 sections

---

## Task 9: Update Session Tracking — Add Worktree Template

**Files:**
- Modify: `skills/_shared/session-tracking.md`

**Step 1: Update status file template**

In "## Status File Update", update the template at lines 26-44 to include `## Worktree`:

```markdown
1. **Create file if not exists** with header:
   ```markdown
   # Session: <feature> — YYYY-MM-DD

   ## Context
   - **Feature**: <feature-name>
   - **Related artifacts**:
     - Design: .agents/design/YYYY-MM-DD-<feature>.md
     - Plan: .agents/plan/YYYY-MM-DD-<feature>.md

   ## Worktree
   - **Path**: `.agents/worktrees/cycle/<feature>`
   - **Branch**: `cycle/<feature>`

   ### Executed Phases

   ### Session Files
   <!-- Absolute paths for retro inspection -->

   ---

   ## Findings for Retro
   <!-- Accumulated across phases -->
   ```
```

**Step 2: Verify worktree in template**

Run: `grep "Worktree" skills/_shared/session-tracking.md`
Expected: Shows "## Worktree" in template

---

## Task 10: Verify All Commits Removed

**Files:**
- All modified skill files

**Step 1: Final verification sweep**

```bash
# Check all phase files for git commit
grep -r "git commit" skills/*/phases/*.md

# Expected output: NONE (or only task-format.md reference if kept for example)
```

**Step 2: Verify worktree flow**

```bash
# Check /design creates worktree
grep -l "git worktree add" skills/design/phases/*.md
# Expected: 1-explore.md

# Check /implement does NOT create worktree
grep -l "git worktree add" skills/implement/phases/*.md
# Expected: (none)

# Check /release does merge/cleanup
grep -l "git worktree remove" skills/release/phases/*.md
# Expected: 3-publish.md
```

---

## Summary

| Task | File | Change |
|------|------|--------|
| 0 | `skills/_shared/worktree-manager.md` | New utility for worktree ops |
| 1 | `skills/design/phases/1-explore.md` | Add worktree creation |
| 2 | `skills/design/phases/3-document.md` | Remove commit, add worktree to status |
| 3 | `skills/plan/phases/1-prepare.md` | Add worktree lookup |
| 4 | `skills/plan/references/task-format.md` | Remove commit step |
| 5 | `skills/implement/phases/1-setup.md` | Use existing worktree |
| 6 | `skills/implement/phases/4-complete.md` | Remove merge, suggest /retro |
| 7 | `skills/retro/phases/3-apply.md` | Remove commit, suggest /release |
| 8 | `skills/release/phases/3-publish.md` | Full cycle commit + merge |
| 9 | `skills/_shared/session-tracking.md` | Add worktree to template |
| 10 | All | Verification sweep |
