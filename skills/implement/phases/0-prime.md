# 0. Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

Then print the phase indicator from @../_shared/visual-language.md showing **implement** as the current phase.

@../_shared/persona.md

## 2. Load Project Context

Read (if they exist):
- `.beastmode/context/IMPLEMENT.md`
- `.beastmode/meta/IMPLEMENT.md`

Follow L2 convention paths (`context/implement/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Resolve the feature name and enter the worktree:

1. If arguments contain a state file path → extract feature name from filename (strip date prefix and `.md`)
2. If no arguments → scan `.beastmode/worktrees/` for directories:
   - Exactly one → use it automatically
   - Multiple → list with branch names, ask user to pick via `AskUserQuestion`
   - Zero → print: "No active worktrees found. Run /design to start a new feature, or provide a state file path as argument." and STOP
3. Enter the worktree:

    worktree_path=".beastmode/worktrees/$feature"
    if [ ! -d "$worktree_path" ]; then
      echo "Error: Worktree not found at $worktree_path"
      exit 1
    fi
    cd "$worktree_path"
    pwd  # confirm you are in the worktree

See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.

## 4. Read Plan

Load the plan from arguments (e.g., `.beastmode/state/plan/YYYY-MM-DD-<topic>.md`).

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
