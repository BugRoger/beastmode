# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Save Deviation Log

If deviations were tracked during execution, save to `.beastmode/state/implement/YYYY-MM-DD-<feature>-deviations.md` where `<feature>` is the worktree directory name:

    # Implementation Deviations: <feature>

    **Date:** YYYY-MM-DD
    **Plan:** .beastmode/state/plan/YYYY-MM-DD-<feature>.md
    **Tasks completed:** N/M
    **Deviations:** N total

    ## Auto-Fixed
    - Task N: <description>

    ## Blocking
    - Task N: <description>

    ## Architectural
    - Task N: <description> — User decision: <choice>

If no deviations, skip this step.

## 2. Phase Retro

@../_shared/retro.md

## 3. Context Report

@../_shared/context-report.md

## 4. [GATE|transitions.implement-to-validate]

Read `.beastmode/config.yaml` → resolve mode for `transitions.implement-to-validate`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print and STOP:
Next step: `/beastmode:validate YYYY-MM-DD-<feature>.md`

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:validate", args="YYYY-MM-DD-<feature>.md")`

If below threshold, print session-restart instructions and STOP.
