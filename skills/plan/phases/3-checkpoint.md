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

## 3. Update Status

Add Plan phase entry to status file.

## 4. Capture Learnings

If notable planning patterns discovered, update `.beastmode/meta/PLAN.md`.

## 5. Session Tracking

@../_shared/session-tracking.md

## 6. Context Report

@../_shared/context-report.md

## 7. Suggest Next Step

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode. DO NOT automatically start implementation.
</HARD-GATE>

```
/implement .beastmode/state/plan/YYYY-MM-DD-<feature-name>.md
```
