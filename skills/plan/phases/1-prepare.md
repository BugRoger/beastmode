# 1. Prepare

## 1. Announce Skill

"I'm using the /plan skill to create the implementation plan."

## 2. Initialize Task Tracking

Call `TodoWrite` to check for existing tasks from design. If tasks exist, enhance them with implementation details. If no tasks, create them as you write each plan task.

## 3. Read Design Document

Read the design doc from arguments (e.g., `.agents/design/YYYY-MM-DD-<topic>.md`).

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

## 5. Explore Codebase

Understand:
- Existing patterns and conventions
- Files that will be touched
- Test structure and commands
- Dependencies and build tools
