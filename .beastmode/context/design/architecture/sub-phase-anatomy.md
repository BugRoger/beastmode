# Sub-Phase Anatomy

## Context
Skills had custom sub-phase structures, making onboarding inconsistent and preventing shared tooling like the task runner.

## Decision
Standardized 0-indexed anatomy for all phased skills: 0-prime (context load + worktree entry), 1-execute (action phase), 2-validate (quality check), 3-checkpoint (persistence + retro). Standalone utilities (/prime, /research, /retro) absorbed into corresponding sub-phases. Worktree entry happens in prime (step 3) for plan/implement/validate; /design creates the worktree in execute.

## Rationale
- Predictable structure enables shared task runner and templates
- Clear separation: prime loads context, execute owns all other side effects
- Folding standalone skills into sub-phases eliminates redundant invocations

## Source
state/design/2026-03-04-skill-anatomy-refactor.md
state/design/2026-03-04-lean-prime-refactor.md
state/design/2026-03-06-worktree-detection-fix.md
