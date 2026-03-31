# Release Meta

Release process focuses on clean history via squash merge, proactive version conflict management, and retro-before-commit ordering.

## Process

Version conflicts are structural in the worktree-branching model; minimize version-bearing files. Squash merge keeps main clean but requires archive tags to preserve branch history and explicit two-phase step ordering. Retro runs before the release commit to capture findings; documentation-only releases skip validate.

1. ALWAYS expect version file staleness in worktree-branching model — worktrees branch from older commits
2. ALWAYS minimize version-bearing files — fewer files with versions means fewer merge conflicts
3. ALWAYS use squash merge over merge-only — cleaner main branch history
4. ALWAYS create archive tags before squash merge — prevents permanent loss of detailed commit history
5. ALWAYS verify step ordering when squash merge separates staging from committing — incorrect ordering causes missed changes
6. ALWAYS run retro before release commit — post-commit retro misses the current release's learnings
7. ALWAYS allow documentation-only releases to skip validate — no behavior changes means nothing to validate
8. ALWAYS expect retro to catch internal inconsistencies missed by implementation and validate — different perspective reveals different gaps

## Workarounds

None recorded.
