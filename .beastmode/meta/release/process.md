# Release Process

## Version Conflict Management
- ALWAYS expect version file staleness in worktree-branching model — worktrees branch from older commits
- ALWAYS minimize version-bearing files — fewer files with versions means fewer merge conflicts

## Squash Merge Workflow
- ALWAYS use squash merge over merge-only — cleaner main branch history
- ALWAYS create archive tags before squash merge — prevents permanent loss of detailed commit history
- ALWAYS verify step ordering when squash merge separates staging from committing — incorrect ordering causes missed changes

## Retro Timing
- ALWAYS run retro before release commit — post-commit retro misses the current release's learnings
- ALWAYS allow documentation-only releases to skip validate — no behavior changes means nothing to validate
- ALWAYS expect retro to catch internal inconsistencies missed by implementation and validate — different perspective reveals different gaps
