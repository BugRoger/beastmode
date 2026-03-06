# Task Runner

Shared utility (`skills/_shared/task-runner.md`) that parses markdown skill files into hierarchical tasks and enforces step completion through a depth-first execution loop. Tracks progress via TodoWrite. Supports lazy expansion, keyword-based auto-reset, and structural gate enforcement.

## Execution Model
Parses `## N. Title` headings and numbered lists into hierarchical tasks. Depth-first execution loop: first pending task with completed/in-progress parent executes next. Max 2 retries per task before blocking. Reports deadlocks when no task can advance.

1. ALWAYS track tasks via TodoWrite — one in_progress at a time
2. NEVER expand linked files eagerly — lazy expansion on first visit only
3. Tasks with `[Link](path)` syntax are opaque until execution reaches them

## Lazy Expansion
Linked files (`[Phase](path)` syntax) expand into child tasks only when the parent task starts execution. Top-level `## N.` headings become children; deeper headings are ignored. Children collapse from TodoWrite after parent completes.

1. ALWAYS parse only top-level headings from linked files — ignore ### and deeper
2. NEVER pre-load all phase files at parse time — expand on demand

## Gate Integration
`## N. [GATE|namespace.gate-id]` steps are structural — the execution loop cannot skip them. Gate resolution reads config.yaml, prunes non-matching GATE-OPTION children, and executes the surviving option.

1. ALWAYS read config.yaml at each gate — no pre-loading or caching
2. NEVER skip gate steps — they are structural task-runner items

## Validation Reset
Tasks whose title contains "Validate", "Approval", "Check", or "Verify" trigger auto-reset on failure: the previous sibling task and its children reset to pending.

1. ALWAYS reset the previous sibling on validation failure — not the validation task itself
