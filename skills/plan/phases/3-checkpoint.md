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

## 5. Phase Transition

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode.
</HARD-GATE>

<!-- HITL-GATE: transitions.plan-to-implement | TRANSITION -->
@../_shared/transition-check.md

Next skill: `beastmode:implement .beastmode/state/plan/YYYY-MM-DD-<feature-name>.md`
