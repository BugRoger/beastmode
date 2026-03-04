# 0. Prime

## 1. Announce Skill

"I'm using the /implement skill to execute the implementation plan."

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/IMPLEMENT.md`
- `.beastmode/meta/IMPLEMENT.md`

## 3. Read Plan

Load the plan from arguments (e.g., `.agents/plan/YYYY-MM-DD-<topic>.md`).

## 4. Enter Feature Worktree

**MANDATORY — do not skip this step.**

Read the worktree path from the status file and `cd` into it:

```bash
status_file=".agents/status/YYYY-MM-DD-<feature>.md"
# Extract path from "## Worktree" section
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')
cd "$worktree_path"
pwd  # confirm you are in the worktree
```

If the worktree path is missing from the status file or the directory doesn't exist, STOP and tell the user — do not continue on main.

See @../_shared/worktree-manager.md for full reference.

## 5. Prepare Environment

```bash
# Install dependencies if needed
npm install  # or appropriate command
```

## 6. Load Task State

Read `.agents/plan/YYYY-MM-DD-<feature>.tasks.json` to resume from last completed task.
