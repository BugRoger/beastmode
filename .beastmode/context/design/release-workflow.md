# Release Workflow

## Version Detection
- ALWAYS use plugin.json as version source of truth — not package.json or tags
- NEVER bump version without conventional commit evidence — traceability

## Commit Sequence
- ALWAYS run retro from release checkpoint before merge — retro runs only at release, needs the worktree intact
- Compaction is manual-only via `beastmode compact` — decoupled from the release pipeline
- ALWAYS commit at each phase checkpoint on the feature branch — work persists across ephemeral per-session worktrees
- ALWAYS squash-merge at release — per-phase commits on the feature branch collapse to one clean commit on main
- ALWAYS use GitHub release style commit messages — consistency
- Execute preps versions and L0 proposal, checkpoint runs retro then squash-merges, commits, tags — phase separation

## Changelog Generation
- ALWAYS categorize by conventional commit prefix (feat, fix, refactor, etc.) — scannable history
- Format: version + title + date — standardized entries

## Merge Strategy
- ALWAYS archive branch tip before squash merge — `git tag archive/feature/<name>` preserves history
- NEVER rebase at merge time — merge-only strategy avoids per-commit conflicts
- Interactive merge options: merge locally (recommended), push and create PR, keep as-is, discard — user choice
