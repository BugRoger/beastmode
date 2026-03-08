# Release Context

## Versioning
- ALWAYS use squash merge for releases — one commit per version on main
- ALWAYS archive feature branch tips as `archive/feature/<name>` before deletion
- ALWAYS follow commit format: `Release vX.Y.Z — Title` with categorized sections
- NEVER skip retro before the release commit

## Release Process
- ALWAYS use merge-only — no rebase before merge
- ALWAYS run retro in execute phase before the release commit
- ALWAYS prepare L0 update proposal from L1 summaries at release time (targets BEASTMODE.md)
- NEVER spread version across more than 3 files (plugin.json, marketplace.json, CHANGELOG.md)

## Changelog
- ALWAYS include Highlights and Full Changelog sections in release artifacts
- ALWAYS categorize changes as Features, Fixes, Docs, or Chores
- ALWAYS maintain consolidated CHANGELOG.md at repo root
- NEVER include empty category sections — only sections with content
