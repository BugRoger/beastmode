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

Follow [worktree-manager.md](../_shared/worktree-manager.md):

1. **Discover Feature** — resolve feature name from arguments or filesystem scan. Uses "Derive Feature Name" for extraction. Do NOT search for similarly named worktrees or artifacts.
2. **Enter Worktree** — cd into the worktree and verify with pwd.

The resolved `feature` name is used for all artifact paths in this phase.

## 4. Read Plan

Resolve the plan artifact using [worktree-manager.md](../_shared/worktree-manager.md) → "Resolve Artifact" with type=`plan` and the feature name from step 3.

Read the resolved file path.

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
