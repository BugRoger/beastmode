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

## 3. Phase Retro

@../_shared/retro.md

## 4. Context Report

@../_shared/context-report.md

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

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:implement", args="<feature>")`

If below threshold, print:

Start a new session and run:

`/beastmode:implement <feature>`

STOP. No additional output.
