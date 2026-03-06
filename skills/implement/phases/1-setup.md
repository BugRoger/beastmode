# 1. Setup (Worktree)

## Overview

The cycle worktree was created by /design. This phase locates and enters it.

**Core principle:** Inherit existing worktree → verify → enter.

**Announce at start:** "Setting up implementation - finding cycle worktree."

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

## Exit Criteria

✓ Worktree found from status file
✓ Changed into worktree directory
✓ Branch confirmed: `cycle/<topic>`

**On success:** Proceed to Phase 2: Prepare
**On failure:** Error with "Run /design first" message
