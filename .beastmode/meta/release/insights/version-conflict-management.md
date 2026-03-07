# Version Conflict Management

## Observation 1
### Context
During v0.4.1 release, 2026-03-04
### Observation
Version conflicts are structural, not accidental. Worktrees branch from older commits, so version files are always stale. Version-bearing files limited to 3 (plugin.json, marketplace.json, session-start.sh) to minimize conflict surface.
### Rationale
Reducing the number of version-bearing files reduces the conflict surface area
### Source
state/release/2026-03-04-v0.4.1.md
### Confidence
[MEDIUM] — confirmed across 2 releases

## Observation 2
### Context
During squash-per-release implementation, 2026-03-05
### Observation
Version files remain stale with squash merge — structural issue persists. Worktree branched from v0.10.0-era while v0.10.1 existed. Squash merge does not fix this — it's inherent to the worktree-branching model.
### Rationale
This is a structural property of the worktree-branching model, not a bug to fix
### Source
state/release/2026-03-05-squash-per-release.md
### Confidence
[MEDIUM] — confirmed across 2 releases
