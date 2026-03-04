# 3. Checkpoint

## 1. Save Deviation Log

If deviations were tracked during execution, save to `.beastmode/state/implement/YYYY-MM-DD-<feature>-deviations.md`:

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

## 4. Phase Transition

<!-- HITL-GATE: transitions.implement-to-validate | TRANSITION -->
@../_shared/transition-check.md

Next skill: `beastmode:validate YYYY-MM-DD-<feature>.md`
