# Plan Skill Improvements

## Goal

Improve beastmode's /plan skill based on comparative analysis with superpowers `writing-plans` and GSD `plan-phase`. Close the most impactful gaps while preserving beastmode's clean sub-phase architecture.

## Research

Compared three plan implementations:
- **Beastmode /plan** — 4-phase sub-phases, pure markdown, manual validation
- **Superpowers writing-plans** — single monolithic prompt, TDD-first, embedded skill routing
- **GSD plan-phase** — 14-step multi-agent orchestrator, automated checker with revision loop, wave-based parallelism

## Approach

Six proposals ranked by value/effort. Fix structural bugs first, then add high-value format extensions, then tackle automated verification.

## Key Decisions

### Fix structural duplication (correctness)
- Remove worktree entry from 1-execute (keep in 0-prime only)
- Remove "Explore Codebase" from 0-prime (keep in 1-execute only — prime is read-only)
- Rationale: 0-prime should load context, 1-execute should act. Current version does both in both places with contradictory logic.

### Task dependency model (high value, low effort)
- Extend task-format.md with `Wave` and `Depends on` fields
- Wave N tasks run before Wave N+1. Independent tasks within a wave can parallelize.
- Rationale: Gives /implement information for parallel execution without requiring a runtime dependency graph.

### Structured skill handoff (medium value, low effort)
- Add machine-readable directive to plan header: `> **For Claude:** Use /implement to execute this plan task-by-task.`
- Rationale: Makes plans self-documenting for cross-session pickup.

### Design coverage verification (medium value, low effort)
- Add to 2-validate: extract components/decisions from design doc, verify each appears in at least one task
- Print coverage table showing design component → plan task mapping
- Rationale: Catches silently dropped requirements before human review.

### Automated plan checker (high value, medium effort)
- Spawn a researcher agent in 2-validate to cross-check plan against design doc
- Check: component coverage, file path validity, step completeness, consistency
- If issues found, return to 1-execute for targeted revision (max 2 cycles)
- Rationale: GSD's strongest pattern — programmatic gap detection before human review.

### Skip plan for trivial changes (deferred)
- If design has <3 components and no architectural decisions, offer to skip to /implement
- Rationale: Low value, nice-to-have. Current design phase is lightweight enough.

## Components

### 0-prime.md changes
- Remove "Explore Codebase" step (move to 1-execute)
- Keep worktree entry as the last prime step

### 1-execute.md changes
- Remove duplicate worktree entry step
- Keep "Explore Codebase" as first execute step
- Keep existing task creation flow unchanged

### 2-validate.md changes
- Replace manual checklist with design coverage table
- Add automated plan checker agent (optional, can be phased in)
- Keep user approval gate as final step

### references/task-format.md changes
- Add `Wave` field (integer, default 1)
- Add `Depends on` field (task references or `-`)
- Add plan header template with skill routing directive

## Files Affected

- `skills/plan/phases/0-prime.md` — remove explore step
- `skills/plan/phases/1-execute.md` — remove duplicate worktree entry
- `skills/plan/phases/2-validate.md` — add coverage table, optional checker
- `skills/plan/references/task-format.md` — add wave/depends fields, header template

## Testing Strategy

- Run /plan on an existing design doc and verify:
  - No duplicate worktree/explore prompts
  - Plan output includes Wave and Depends on fields
  - Coverage table generated in validate phase
  - Skill routing directive in plan header
