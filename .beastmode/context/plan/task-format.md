# Task Format

## Task Structure
- ALWAYS include Wave and Depends-on fields — ordering metadata
- ALWAYS include Files section with exact paths (Create/Modify/Test with line ranges) — scoping
- ALWAYS include verification step with expected output — pass/fail clarity
- ALWAYS write complete code in steps — never "add validation" or similar vague instructions
- Each task has heading (`### Task N: [Name]`), metadata, Files, numbered steps, verification — standardized skeleton

## Wave Ordering
- ALWAYS assign wave numbers to tasks — execution ordering
- ALWAYS declare dependencies with `Depends on: Task N` or `-` for none — explicit ordering
- NEVER assume parallel execution without Parallel-safe flag — safety first
- Wave 1 runs before Wave 2, etc. — sequential wave progression
- Default wave is 1 if omitted — sensible default

## Parallel Safety
- Parallel-safe flag is written by /plan validation — never by the human planner
- If two tasks in a wave share a file, the later task moves to Wave N+1 — auto-resequencing
- Single-task waves are not flagged — nothing to parallelize
- /implement verifies the flag at runtime before parallel dispatch — double-check

## Design Coverage
- ALWAYS verify design coverage before approval — no orphaned components
- ALWAYS print coverage table showing component-to-task mapping — traceability
- Missing components trigger a return to execute phase — forces completeness
