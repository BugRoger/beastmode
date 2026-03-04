# Release v0.6.1

**Date:** 2026-03-04

## Highlights

Eliminates constant merge conflicts in the /release phase by switching from rebase to merge-only and reducing version file sprawl from 5 to 3.

## Fixes

- Drop `git rebase origin/main` from release execute phase — merge resolves conflicts once instead of per-commit replay
- Remove hardcoded version badge from README.md (version lives in plugin.json and CHANGELOG.md)
- Remove `## Current Version` section from PRODUCT.md (version lives in plugin.json)
- Remove fast-forward note from worktree manager (no longer applies without rebase)
- Clean up HITL gate significance check for stale "Current Version" reference

## Full Changelog

- dbae884 WIP: pre-release changes
