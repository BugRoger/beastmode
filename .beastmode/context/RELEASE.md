# Release Context

## Versioning
- ALWAYS use squash merge for releases — one commit per version on main
- ALWAYS archive feature branch tips as `archive/feature/<name>` before deletion
- ALWAYS follow commit format: `Release vX.Y.Z — Title` with categorized sections
- NEVER skip retro before the release commit

## Release Process
- ALWAYS use merge-only — no rebase before merge
- ALWAYS bump versions and update CHANGELOG on main AFTER the squash merge — never in the worktree
- ALWAYS read main's plugin.json for the current version — the worktree's copy is stale
- ALWAYS resolve version file and CHANGELOG conflicts with --ours (main) during squash merge
- ALWAYS resolve code file conflicts with --theirs (feature branch) during squash merge
- NEVER modify version files (plugin.json, marketplace.json, session-start.sh) or CHANGELOG.md in the worktree

## Changelog
- ALWAYS include Highlights and Full Changelog sections in release artifacts
- ALWAYS categorize changes as Features, Fixes, Docs, or Chores
- ALWAYS maintain consolidated CHANGELOG.md at repo root
- NEVER include empty category sections — only sections with content
