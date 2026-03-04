# 3. Checkpoint

## 1. Save Report

Save to `.beastmode/state/validate/YYYYMMDD-{feature}.md`

## 2. Phase Retro

@../_shared/retro.md

## 3. Context Report

@../_shared/context-report.md

## 4. Phase Transition

If FAIL:
```
Validation failed. Fix issues and re-run:
/validate
```
STOP — do not proceed to transition check.

If PASS:

<!-- HITL-GATE: transitions.validate-to-release | TRANSITION -->
@../_shared/transition-check.md

Next skill: `beastmode:release YYYY-MM-DD-<feature>.md`
