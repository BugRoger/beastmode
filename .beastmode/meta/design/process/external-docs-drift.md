# External Documentation Drift

## Observation 1
### Context
During roadmap-audit design, 2026-03-05
### Observation
ROADMAP drift is predictable with the worktree model. Features ship on feature branches but ROADMAP lives on main. External-facing docs need their own audit cadence.
### Rationale
The retro walker doesn't touch external docs (README, ROADMAP, CHANGELOG)
### Source
state/design/2026-03-05-roadmap-audit.md
### Confidence
[LOW] — single observation

## Observation 2
### Context
During review-progressive-hierarchy design, 2026-03-06
### Observation
External docs drift from internal knowledge hierarchy. docs/progressive-hierarchy.md was missing three domains and write protection rules that existed in internal context files.
### Rationale
External-facing specs need periodic review against the knowledge hierarchy
### Source
state/design/2026-03-06-review-progressive-hierarchy.md
### Confidence
[MEDIUM] — confirmed across 2 features
