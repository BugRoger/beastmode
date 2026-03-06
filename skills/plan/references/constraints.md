# Plan Constraints

## No Plan Mode

**You MUST NOT call `EnterPlanMode` or `ExitPlanMode` at any point during this skill.**

This skill operates in normal mode and manages its own completion flow via `AskUserQuestion`.

- Calling `EnterPlanMode` traps the session in plan mode where Write/Edit are restricted
- Calling `ExitPlanMode` breaks the workflow and skips the user's execution choice

If you feel the urge to call either, STOP — follow this skill's instructions instead.
