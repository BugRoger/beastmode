# Conventions

## File Naming
- ALWAYS use UPPERCASE.md for invariant meta files, lowercase.md for variant files — naming signals intent
- ALWAYS prefix state files with date: YYYY-MM-DD-feature-name.md — chronological ordering
- NEVER mix naming conventions within a directory level — consistency

## Skill Definitions
- ALWAYS define skill as a single self-contained SKILL.md with YAML frontmatter — standardized discovery
- ALWAYS use inline phase sections within SKILL.md — no external phase files or @imports
- ALWAYS write phase instructions in imperative voice with numbered steps — actionable clarity
- ALWAYS follow uniform section ordering in phase skills: Title > HARD-GATE > Guiding Principles > Phase 0-3 > Constraints > Reference — structural consistency
- ALWAYS use 3 heading levels max in skill files: `#` title, `##` major sections, `###` subsections — prevents hierarchy pollution
- ALWAYS place templates and reference material in a `## Reference` section at the end — separates instructions from reference data
- ALWAYS include "All user input via AskUserQuestion" in skill guiding principles — enables HITL hook interception
- NEVER use @imports between skills — each SKILL.md is self-contained

## Branch Naming
- ALWAYS use `feature/<feature>` branch naming — convention
- ALWAYS create worktrees at `.beastmode/worktrees/<feature>` — standard location
- NEVER work directly on main — use worktree isolation
- Design creates both branch and worktree, all phases inherit, /release merges and cleans up — full lifecycle

## Anti-Patterns
- NEVER put shared logic in individual skills — extract to shared agents or CLI modules
- NEVER create circular dependencies between files — dependency loops
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
- Skill flattening to self-contained SKILL.md — see remove-task-runner release (2026-04-03)
- Git branching with feature/<feature> convention — see [git-branching-strategy](../../state/plan/2026-03-04-git-branching-strategy.md)
- Init L2 expansion and context doc format — see [init-l2-expansion](../../state/plan/2026-03-08-init-l2-expansion.md)
