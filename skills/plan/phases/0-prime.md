# 0. Prime

## 1. Announce Skill

"I'm using the /plan skill to create the implementation plan."

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/PLAN.md`
- `.beastmode/meta/PLAN.md`

## 3. Check Research Trigger

Research triggers if ANY:
- Arguments contain research keywords
- Design references unfamiliar technology
- Complex integration required

If triggered, spawn Explore agent and save findings.

## 4. Read Design Document

Read the design doc from arguments (e.g., `.beastmode/state/design/YYYY-MM-DD-<topic>.md`).

## 5. Enter Feature Worktree

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

## 6. Explore Codebase

Understand:
- Existing patterns and conventions
- Files that will be touched
- Test structure and commands
- Dependencies and build tools
