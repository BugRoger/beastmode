# Squash Merge Workflow

## Observation 1
### Context
During v0.4.1 release, 2026-03-04
### Observation
Merge-only eliminates rebase conflicts. Rebasing replays each commit, so a single conflict can recur N times. Merge resolves everything once. (Note: mechanism evolved to git merge --squash in v0.11.0 — core anti-rebase insight still valid.)
### Rationale
Merge-based strategies resolve conflicts once; rebase-based strategies multiply them
### Source
state/release/2026-03-04-v0.4.1.md
### Confidence
[LOW] — superseded by squash merge

## Observation 2
### Context
During squash-per-release implementation, 2026-03-05
### Observation
Squash merge supersedes merge-only. git merge --squash collapses all branch commits into a single staged changeset on main, eliminating both rebase conflicts AND merge commit noise.
### Rationale
Squash merge is strictly better than merge-only for this project's workflow
### Source
state/release/2026-03-05-squash-per-release.md
### Confidence
[MEDIUM] — confirmed mechanism change

## Observation 3
### Context
During squash-per-release implementation, 2026-03-05
### Observation
Archive tags preserve branch history that squash merge destroys on main. Tagging branch tips as archive/feature/<name> before deletion keeps the full commit graph reachable.
### Rationale
History preservation is important for debugging and audit trails
### Source
state/release/2026-03-05-squash-per-release.md
### Confidence
[MEDIUM] — established practice

## Observation 4
### Context
During squash-per-release implementation, 2026-03-05
### Observation
Step ordering matters when squash merge separates staging from committing. git merge --squash stages but does NOT commit. Steps must model both halves explicitly.
### Rationale
Two-phase git operations need explicit step ordering in plans
### Source
state/release/2026-03-05-squash-per-release.md
### Confidence
[LOW] — single feature observation
