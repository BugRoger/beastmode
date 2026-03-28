# 0. Prime

<HARD-GATE>
## 1. Discover and Enter Feature Worktree

1. **Discover Feature** — resolve feature name from arguments or filesystem scan via [worktree-manager.md](../_shared/worktree-manager.md). Do NOT search for similarly named worktrees or artifacts.
2. **Enter Worktree** — cd into the worktree and verify with pwd.

The resolved `feature` name is used for all artifact paths in this phase.
</HARD-GATE>

## 2. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 3. Load Project Context

Read (if they exist):
- `.beastmode/context/IMPLEMENT.md`
- `.beastmode/meta/IMPLEMENT.md`

Follow L2 convention paths (`context/implement/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 4. Read Plan

Resolve the plan artifact using [worktree-manager.md](../_shared/worktree-manager.md) → "Resolve Artifact" with type=`plan` and the feature name from step 1.

Read the resolved file path.

## 5. Sync GitHub

Read `.beastmode/config.yaml`. If `github.enabled` is `false` or missing, or the manifest has no `github` block, skip this step.

@../_shared/github.md

Use warn-and-continue for all GitHub calls (see Error Handling Convention in github.md).

1. **Set Feature In-Progress** — update the feature issue label:

```bash
gh issue edit <feature-issue> --remove-label "status/ready" --add-label "status/in-progress"
```

2. **Add Feature to Project** — call the "Add to Project + Set Status" operation from github.md with the feature URL and status `"Implement"`.

3. **Advance Epic Phase** — if not already at `phase/implement`, set the Epic's phase label:

```bash
gh issue edit <epic-number> --remove-label "phase/plan" --add-label "phase/implement"
```

4. **Add Epic to Project** — call the "Add to Project + Set Status" operation from github.md with the epic URL and status `"Implement"`.

## 6. Prepare Environment

    # Install dependencies if needed
    npm install  # or appropriate command from .beastmode/context/

## 7. Parse Waves

Extract wave numbers and dependencies from all tasks in the plan:

1. Scan for `### Task N:` headings
2. For each task, extract `**Wave:**` and `**Depends on:**` fields
3. Group tasks by wave number (default wave = 1 if omitted)
4. Within each wave, build dependency order from `Depends on` field
5. Store as internal wave map:

    Wave 1: [Task 0 (no deps), Task 1 (no deps), Task 2 (depends: Task 1)]
    Wave 2: [Task 3 (depends: Task 0, Task 2)]

## 8. Load Task Persistence

Read `.beastmode/state/plan/YYYY-MM-DD-<feature>.tasks.json` if it exists.

- If found: skip already-completed tasks, resume from first pending task
- If not found: all tasks start as pending (first run)

Initialize deviation log as empty list.
