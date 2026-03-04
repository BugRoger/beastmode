# 0. Prime

## 1. Announce Skill

"I'm using the /implement skill to execute the implementation plan."

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/IMPLEMENT.md`
- `.beastmode/meta/IMPLEMENT.md`

## 3. Read Plan

Load the plan from arguments (e.g., `.beastmode/state/plan/YYYY-MM-DD-<topic>.md`).

## 4. Enter Feature Worktree

**MANDATORY — do not skip this step.**

Read the worktree path from the feature name and `cd` into it:

    feature="<feature-name>"  # from plan doc filename
    worktree_path=".beastmode/worktrees/$feature"
    if [ ! -d "$worktree_path" ]; then
      echo "Error: Worktree not found at $worktree_path"
      exit 1
    fi
    cd "$worktree_path"
    pwd  # confirm you are in the worktree

If the worktree directory doesn't exist, STOP and tell the user — do not continue on main.

See @../_shared/worktree-manager.md for full reference.

## 5. Prepare Environment

    # Install dependencies if needed
    npm install  # or appropriate command from .beastmode/context/

## 6. Parse Waves

Extract wave numbers and dependencies from all tasks in the plan:

1. Scan for `### Task N:` headings
2. For each task, extract `**Wave:**` and `**Depends on:**` fields
3. Group tasks by wave number (default wave = 1 if omitted)
4. Within each wave, build dependency order from `Depends on` field
5. Store as internal wave map:

    Wave 1: [Task 0 (no deps), Task 1 (no deps), Task 2 (depends: Task 1)]
    Wave 2: [Task 3 (depends: Task 0, Task 2)]

## 7. Load Task Persistence

Read `.beastmode/state/plan/YYYY-MM-DD-<feature>.tasks.json` if it exists.

- If found: skip already-completed tasks, resume from first pending task
- If not found: all tasks start as pending (first run)

Initialize deviation log as empty list.
