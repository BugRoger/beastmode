# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Save Plan

Save to `.beastmode/state/plan/YYYY-MM-DD-<feature>.md` where `<feature>` is the worktree directory name.

## 2. Create Task Persistence File

Save to `.beastmode/state/plan/YYYY-MM-DD-<feature-name>.tasks.json`:

```json
{
  "planPath": ".beastmode/state/plan/YYYY-MM-DD-feature.md",
  "tasks": [
    {"id": 0, "subject": "Task 0: ...", "status": "pending"},
    {"id": 1, "subject": "Task 1: ...", "status": "pending"}
  ],
  "lastUpdated": "<timestamp>"
}
```

## 3. Sync GitHub

Read `.beastmode/config.yaml`. If `github.enabled` is `false` or missing, or the manifest has no `github` block, skip this step.

@../_shared/github.md

Use warn-and-continue for all GitHub calls (see Error Handling Convention in github.md).

1. **Advance Epic Phase** — set the Epic's phase label to `phase/plan`:

```bash
gh issue edit <epic-number> --remove-label "phase/design" --add-label "phase/plan"
```

2. **Add Epic to Project** — call the "Add to Project + Set Status" operation from github.md with the epic URL and status `"Plan"`.

3. **Create Feature Issues** — for each feature in the manifest, use the "Create Feature" operation from github.md. Store feature issue numbers in the manifest.

4. **Add Features to Project** — for each created feature, call the "Add to Project + Set Status" operation from github.md with the feature URL and status `"Plan"`.

## 4. Phase Retro

@../_shared/retro.md

## 5. [GATE|transitions.plan-to-implement]

Read `.beastmode/config.yaml` → resolve mode for `transitions.plan-to-implement`.
Default: `human`.

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode.
</HARD-GATE>

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:implement <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:implement", args="<feature>")`
