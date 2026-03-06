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
