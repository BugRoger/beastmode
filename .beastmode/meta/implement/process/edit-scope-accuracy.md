# Edit Scope Accuracy

## Observation 1
### Context
During worktree-artifact-alignment implementation, 2026-03-08. Task 2 (design/3-checkpoint.md) had a plan specifying edits to lines 1-5.
### Observation
The plan scoped the edit to lines 1-5 (replacing `<topic>` with `<feature>` in the artifact filename), but three additional `<topic>` references existed in the transition gate section (lines 49, 56, 60) outside the specified range. The implementer used replace_all to fix all occurrences, which was logged as an auto-fix deviation. Plans that specify line-range edits should account for ALL occurrences of the pattern being changed, not just the primary location.
### Rationale
Line-range scoping in plans creates a false sense of completeness. When a plan changes a placeholder or pattern, it should either enumerate all locations or explicitly instruct replace_all for global substitution. The auto-fix mechanism caught this, but it would have been cleaner to specify it in the plan.
### Source
.beastmode/artifacts/implement/2026-03-08-worktree-artifact-alignment-deviations.md
### Confidence
[LOW] — first observation
