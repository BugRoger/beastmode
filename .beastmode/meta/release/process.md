# Release Process

## Version Conflict Management
- Version file staleness is structural to the worktree-branching model — worktrees branch from older commits so version files are always stale
- Minimizing version-bearing files reduces conflict surface — fewer files with versions means fewer merge conflicts

## Squash Merge Workflow
- Squash merge supersedes merge-only — cleaner main branch history
- Archive tags preserve branch history that squash destroys on main — prevents permanent loss of detailed commit history
- Step ordering matters when squash merge separates staging from committing — incorrect ordering causes missed changes

## Retro Timing
- Retro must run before release commit to capture all outputs — post-commit retro misses the current release's learnings
- Documentation-only releases skip validate naturally — no behavior changes means nothing to validate
- Retro findings catch internal inconsistencies that implementation and validate miss — different perspective reveals different gaps
