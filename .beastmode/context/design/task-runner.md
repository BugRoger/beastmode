# Task Runner

## Execution Model
- ALWAYS track tasks via TodoWrite — one in_progress at a time
- NEVER expand linked files eagerly — lazy expansion on first visit only
- Tasks with `[Link](path)` syntax are opaque until execution reaches them — deferred loading
- Depth-first execution loop: first pending task with completed/in-progress parent executes next — deterministic order
- Max 2 retries per task before blocking — prevents infinite loops
- Reports deadlocks when no task can advance — fail-fast

## Lazy Expansion
- ALWAYS parse only top-level headings from linked files — ignore ### and deeper
- NEVER pre-load all phase files at parse time — expand on demand
- Children collapse from TodoWrite after parent completes — keeps list manageable

## Validation Reset
- ALWAYS reset the previous sibling on validation failure — not the validation task itself
- Tasks with "Validate", "Approval", "Check", or "Verify" in title trigger auto-reset — keyword-based detection
