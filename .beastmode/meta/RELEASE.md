# Release Meta

Learnings from release phases. Key patterns: worktrees branch from older commits so version files are always stale, squash merge strategy produces clean single-commit history while avoiding rebase conflicts, and retro must run before commit to capture all outputs.

## SOPs
No release SOPs established yet. SOPs will be added by retro classification or auto-promoted from recurring learnings.
@release/sops.md

## Overrides
No project-specific release overrides yet. Overrides will be added by retro classification or user.
@release/overrides.md

## Learnings
Four key learnings from v0.11.0: squash merge supersedes merge-only, archive tags preserve branch history, step ordering matters for squash merge, and version file staleness persists with squash merge. Plus three foundational learnings from v0.4.1.
@release/learnings.md
