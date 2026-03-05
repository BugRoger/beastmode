# 3. Checkpoint

## 1. Save Plan

Save to `.beastmode/state/plan/YYYY-MM-DD-<feature-name>.md`

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

## 5. Gate: transitions.plan-to-implement

Read `.beastmode/config.yaml` → check `transitions.plan-to-implement`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode.
</HARD-GATE>

### 5.1 human — Suggest Next Step

Print and STOP:
Next step: `/beastmode:implement .beastmode/state/plan/YYYY-MM-DD-<feature-name>.md`

### 5.2 auto — Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:implement", args=".beastmode/state/plan/YYYY-MM-DD-<feature-name>.md")`

If below threshold, print session-restart instructions and STOP.
