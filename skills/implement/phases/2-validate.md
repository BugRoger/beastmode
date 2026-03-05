# 2. Validate

## 1. Run Tests

    # Run project test command (from .beastmode/context/implement/testing.md)
    npm test  # or appropriate command

Capture output and exit code.

## 2. Run Build (if applicable)

    npm run build  # or appropriate command

## 3. Run Lint (if applicable)

    npm run lint  # or appropriate command

## 4. Check Results

- All tests pass? ✓/✗
- Build succeeds? ✓/✗
- No lint errors? ✓/✗

## 5. Fix Loop

If any check fails:
1. Analyze the failure — identify root cause
2. Attempt a targeted fix (scope to the failing area)
3. Re-run the failing check
4. If fixed: continue to next check
5. If still failing after 2 attempts: report to user with actionable detail

Do NOT just "stop and report" on first failure. Attempt a fix first.

## 6. Deviation Summary

Print the accumulated deviation log from the execute phase:

    ### Deviation Summary

    Auto-fixed: N
    - [Auto-fix] Task 3: Added missing import
    - [Auto-fix] Task 5: Fixed type mismatch

    Blocking: N
    - [Blocking] Task 7: Installed missing package

    Architectural: N
    - [Architectural] Task 9: User approved cache layer

    Total: N deviations (N auto-fixed, N blocking, N architectural)

If no deviations: "No deviations — plan executed exactly as written."

## 7. Gate: implement.validation-failure

If any check still fails after fix loop:
- Report failures with full context
- Do NOT proceed to checkpoint

Read `.beastmode/config.yaml` → check `gates.implement.validation-failure`.
Default: `auto`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 7.1 human — Ask User

Ask: "Fix manually and re-run /implement, or investigate together?"

### 7.2 auto — Claude Investigates

Attempt additional investigation and targeted fixes. After exhausting options, log the failures and proceed to checkpoint with a warning.
Do NOT proceed to next phase if critical tests fail.
Log: "Gate `implement.validation-failure` → auto: <decision>"
