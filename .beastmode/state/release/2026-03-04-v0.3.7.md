# Release v0.3.7

**Date:** 2026-03-04

## Highlights

Fix version conflicts during release merge by syncing with main before bumping. Also ensures session-start.sh banner version stays in sync.

## Features

- Add "Sync with Main" rebase step to release flow (step 2), eliminating version file conflicts on merge
- Switch version detection from git tags to plugin.json for accurate post-rebase version reads
- Add hooks/session-start.sh to version bump list alongside plugin.json and marketplace.json
- Annotate worktree-manager.md with fast-forward merge note after rebase

## Full Changelog

- d53fab4 feat(release-version-sync): add sync step, plugin.json detection, session-start.sh bump
