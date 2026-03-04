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

Read the worktree path from the feature name and `cd` into it:

```bash
feature="<feature-name>"  # from design doc filename
worktree_path=".beastmode/worktrees/$feature"
if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi
cd "$worktree_path"
pwd  # confirm you are in the worktree
```

If the worktree directory doesn't exist, STOP and tell the user — do not continue on main.

See @../_shared/worktree-manager.md for full reference.
