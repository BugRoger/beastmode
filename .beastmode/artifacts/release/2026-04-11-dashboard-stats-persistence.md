---
phase: release
slug: c8764e
epic: dashboard-stats-persistence
bump: minor
---

# Release: dashboard-stats-persistence

**Version:** v0.114.0
**Date:** 2026-04-11

## Highlights

Dashboard statistics now persist across restarts via a JSON file, and operators can toggle between all-time and current-session stats views with a keyboard shortcut.

## Features

- Add persistence module with load/save/merge for cumulative dashboard stats (`dashboard-stats.json`)
- Wire persistence load and flush into App component on startup and session completion
- Add `s` key toggle to switch between all-time and current-session stats views
- Add `toSessionStats` converter for session-scoped stat snapshots
- Add `statsViewMode` to DetailsPanel and content resolver
- Add stats mode indicator to key hints bar
- Wire stats view toggle into App component

## Full Changelog

- `98426436` design(dashboard-stats-persistence): checkpoint
- `eaefc2dc` plan(dashboard-stats-persistence): checkpoint
- `d2094a00` test(stats-persistence): add BDD integration test scaffolding (RED)
- `db6ba013` feat(stats-persistence): add persistence module with load/save/merge
- `a1384dbf` feat(stats-persistence): wire persistence load and flush into App
- `841d9f7a` implement(dashboard-stats-persistence-stats-persistence): checkpoint
- `31318984` test(stats-view-toggle): add integration test (RED)
- `e594cf62` feat(stats-view-toggle): add toSessionStats converter
- `75e3dd47` feat(stats-view-toggle): add s key toggle to keyboard handler
- `b5861a04` feat(stats-view-toggle): add stats mode to key hints
- `0e8e2b6d` feat(stats-view-toggle): add statsViewMode to DetailsPanel and resolver
- `c120db2e` feat(stats-view-toggle): wire toggle into App component
- `45f99275` implement(dashboard-stats-persistence-stats-view-toggle): checkpoint
- `77302bf7` validate(dashboard-stats-persistence): checkpoint
