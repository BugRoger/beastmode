# Release Process

Emerging process patterns from release phases. Three topic clusters on version conflict management, squash merge workflow, and retro timing.

## Version Conflict Management
Version file staleness is structural to the worktree-branching model. Worktrees branch from older commits, so version files are always stale. Minimizing version-bearing files reduces conflict surface.

## Squash Merge Workflow
Squash merge supersedes merge-only. Archive tags preserve branch history that squash destroys on main. Step ordering matters when squash merge separates staging from committing.

## Retro Timing
Retro must run before release commit to capture all outputs. Documentation-only releases skip validate naturally. Retro findings catch internal inconsistencies that implementation and validate miss.
