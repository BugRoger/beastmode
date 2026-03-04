# 0. Prime

## 1. Announce Skill

"I'm using the /validate skill to verify code quality."

## 2. Load Context

Read:
- `.beastmode/context/VALIDATE.md`
- `.beastmode/meta/VALIDATE.md`

## 3. Enter Feature Worktree

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

## 4. Identify Test Strategy

From context, determine:
- Test command (e.g., `npm test`, `pytest`)
- Lint command (if configured)
- Type check command (if configured)
- Custom gates from meta
