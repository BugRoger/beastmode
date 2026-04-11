# Release Context

## Versioning
- ALWAYS use squash merge for releases — one commit per version on main
- ALWAYS archive feature branch tips as `archive/feature/<name>` before deletion
- ALWAYS follow commit format: `Release vX.Y.Z — Title` with categorized sections

## Release Process
- ALWAYS rebase the feature branch onto main before squash merge — prevents stale fork point from overwriting intermediate main commits
- ALWAYS bump versions and update CHANGELOG on main AFTER the squash merge — never in the worktree
- ALWAYS read main's plugin.json for the current version — the worktree's copy is stale
- ALWAYS resolve version file and CHANGELOG conflicts with --ours (main) during squash merge
- NEVER auto-resolve code file conflicts with --theirs during squash merge — post-rebase, remaining code conflicts indicate genuine divergence and must fail loudly for manual review
- NEVER modify version files (plugin.json, marketplace.json) or CHANGELOG.md in the worktree
- NEVER skip retro before the release commit — retro output must be included in the squash merge
- ALWAYS run retro inlined in the release skill — no shared orchestrator import
- ALWAYS use context walker as the sole retro agent — meta walker removed
- ALWAYS run retro with all phase artifacts (design, plan, implement, validate, release) in a single pass
- ALWAYS expect impl branches (`impl/<slug>--*`) to be deleted by worktree `remove()` at release — no manual cleanup needed

## Changelog
- ALWAYS include Highlights and Full Changelog sections in release artifacts
- ALWAYS categorize changes as Features, Fixes, Docs, or Chores
- ALWAYS maintain consolidated CHANGELOG.md at repo root
- NEVER include empty category sections — only sections with content
