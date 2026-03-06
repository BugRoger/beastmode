# 3. Checkpoint

## 1. Save Report

Save to `.beastmode/state/validate/YYYYMMDD-{feature}.md`

## 2. Phase Retro

@../_shared/retro.md

## 3. Context Report

@../_shared/context-report.md

## 4. [GATE|transitions.validate-to-release]

If FAIL:
```
Validation failed. Fix issues and re-run:
/validate
```
STOP — do not proceed to transition check.

If PASS:

Read `.beastmode/config.yaml` → resolve mode for `transitions.validate-to-release`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print and STOP:
Next step: `/beastmode:release YYYY-MM-DD-<feature>.md`

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:release", args="YYYY-MM-DD-<feature>.md")`

If below threshold, print session-restart instructions and STOP.
