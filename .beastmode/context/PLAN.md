# Plan Context

## Conventions
- ALWAYS use UPPERCASE.md for invariant meta files, lowercase.md for variant files
- ALWAYS number phase files 0-3 (0-prime read-only, 1-execute, 2-validate, 3-checkpoint)
- ALWAYS compose shared functionality via @imports from `skills/_shared/` — NEVER @import between knowledge hierarchy levels (L0/L1/L2/L3)
- ALWAYS use gate syntax: `## N. [GATE|namespace.gate-id]` with GATE-OPTION subsections
- ALWAYS use `feature/<feature>` branch naming convention

## Structure
- ALWAYS colocate skill interface (SKILL.md) with implementation in `/skills/{verb}/`
- NEVER store context outside `.beastmode/` — it's the single source of truth
- Agent prompts live in `/agents/`, shared utilities in `skills/_shared/`
- Worktrees live at `.beastmode/worktrees/<feature>`, gitignored

## Task Format
- ALWAYS include Wave and Depends-on fields on every task
- ALWAYS include Files section with exact paths (Create/Modify/Test)
- NEVER mark a wave Parallel-safe without file isolation analysis
- ALWAYS include verification steps with expected output

## Workflow
- ALWAYS follow phase lifecycle: design -> plan -> implement -> validate -> release
- NEVER commit during individual phases — unified commit at /release
- ALWAYS update status file on phase completion with session paths
