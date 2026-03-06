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

## 5. Enter Cycle Worktree

```bash
status_file=".agents/status/YYYY-MM-DD-<topic>.md"
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')

cd "$worktree_path"
```

Report: "Working in cycle worktree at `$worktree_path`"

## 6. Explore Codebase

Understand:
- Existing patterns and conventions
- Files that will be touched
- Test structure and commands
- Dependencies and build tools
