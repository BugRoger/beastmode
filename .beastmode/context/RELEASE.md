# Release Context

Release workflow and versioning conventions. Squash-per-release commits: `git merge --squash` collapses feature branches into one commit on main with GitHub release style messages (`Release vX.Y.Z — Title`). Feature branch tips preserved via archive tags. Handles version detection, commit categorization, changelog generation, marketplace updates, worktree merge/cleanup, and retro capture.

## Versioning
Versioning strategy, commit message format, and archive tagging conventions.

1. ALWAYS use squash merge for releases — one commit per version on main
2. ALWAYS archive feature branch tips as `archive/feature/<name>` before deletion
3. ALWAYS follow commit format: `Release vX.Y.Z — Title` with categorized sections
4. NEVER skip retro before the release commit

release/versioning.md
