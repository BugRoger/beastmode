# Release Meta

Learnings from release phases. Key patterns: worktrees branch from older commits so version files are always stale, squash merge strategy produces clean single-commit history while avoiding rebase conflicts, retro must run before commit to capture all outputs, and retro findings reliably catch internal inconsistencies that implementation and validate miss.

## SOPs
No release SOPs established yet. SOPs will be added by retro classification or auto-promoted from recurring learnings.
release/sops.md

## Overrides
No project-specific release overrides yet. Overrides will be added by retro classification or user.
release/overrides.md

## Learnings
Seven key learnings from v0.11.0: squash merge supersedes merge-only, archive tags preserve branch history, step ordering matters for squash merge, and version file staleness persists. Plus three from v0.14.4: docs-only releases skip validate, retro agent extension validates reuse pattern, retro catches internal inconsistencies. Three foundational learnings from v0.4.1.
release/learnings.md
