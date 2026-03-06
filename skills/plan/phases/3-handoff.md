# 3. Handoff


## 1. Session Tracking

@../_shared/session-tracking.md

## 2. Context Report

@../_shared/context-report.md

## 3. Ask User

<HARD-GATE>
STOP. You are about to complete the plan. DO NOT call EnterPlanMode or ExitPlanMode. DO NOT automatically start implementation.
</HARD-GATE>

Your ONLY permitted next action is calling `AskUserQuestion`:

```yaml
AskUserQuestion:
  question: "Plan complete and saved. Ready to continue with implementation?"
  header: "Next Step"
  options:
    - label: "Yes, continue with /implement"
      description: "I'll run /implement to execute this plan"
    - label: "No, I'll review first"
      description: "End here, I'll invoke /implement manually when ready"
```


## 4. Print Command

```
/implement .agents/plan/YYYY-MM-DD-<feature-name>.md
```

Replace with the actual filename. **ONLY invoke the skill yourself with confirmation from the user**