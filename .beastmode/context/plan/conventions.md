# Conventions

## File Naming
- ALWAYS use UPPERCASE.md for invariant meta files, lowercase.md for variant files — naming signals intent
- ALWAYS prefix state files with date: YYYY-MM-DD-feature-name.md — chronological ordering
- NEVER mix naming conventions within a directory level — consistency

## Skill Definitions
- ALWAYS define skill interface in SKILL.md with YAML frontmatter — standardized discovery
- ALWAYS number phase files: 0-prime, 1-execute, 2-validate, 3-checkpoint — sub-phase anatomy
- ALWAYS write phase instructions in imperative voice with numbered steps — actionable clarity
- ALWAYS keep 0-prime read-only — no worktree entry, no file writes
- ALWAYS make worktree entry step 1 of 1-execute — first side effect
- ALWAYS reference task-runner as first line inside HARD-GATE block — never as trailing @import

## Branch Naming
- ALWAYS use `feature/<feature>` branch naming — convention
- ALWAYS create worktrees at `.beastmode/worktrees/<feature>` — standard location
- NEVER work directly on main — use worktree isolation
- Design creates both branch and worktree, all phases inherit, /release merges and cleans up — full lifecycle

## Anti-Patterns
- NEVER put shared logic in individual skills — extract to `skills/` root as shared utilities
- NEVER create circular @imports between files — dependency loops
- NEVER hardcode paths that should be convention-based — brittleness
- NEVER add "just in case" sections to context docs — document what exists
- NEVER commit during implement phase — /release owns the merge
- NEVER use @ in flowing prose — use markdown links for inline references, reserve @ for standalone mandatory imports

## Context Document Format
- ALWAYS use `[Populated by init or retro]` as placeholder text in skeleton L2 files — signals ownership
- ALWAYS use `- ALWAYS [rule] — [rationale]` / `- NEVER [rule] — [rationale]` bullet format in L2 files — retro-compatible output
- ALWAYS pair every L2 file with a matching L3 directory containing `.gitkeep` — structural invariant
- ALWAYS use L3 records with Context/Decision/Rationale/Source/Confidence structure — standardized evidence

## Related Decisions
- Skill anatomy standardized to 4 sub-phases — see [skill-anatomy-refactor](../../state/plan/2026-03-04-skill-anatomy-refactor.md)
- Lean prime refactor — 0-prime read-only, see [lean-prime-refactor](../../state/plan/2026-03-04-lean-prime-refactor.md)
- Git branching with feature/<feature> convention — see [git-branching-strategy](../../state/plan/2026-03-04-git-branching-strategy.md)
- Init L2 expansion and context doc format — see [init-l2-expansion](../../state/plan/2026-03-08-init-l2-expansion.md)
