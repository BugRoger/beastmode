---
phase: release
slug: dashboard-fullheight-redesign
epic: dashboard-fullheight-redesign
bump: minor
---

# Release: dashboard-fullheight-redesign

**Version:** v0.79.0
**Date:** 2026-04-04

## Highlights

Full-height two-column dashboard layout with redesigned epic list using phase-specific icons and compact badge styling.

## Features

- Create TwoColumnLayout component with full-height viewport design
- Add backgroundColor prop to PanelBox for theme flexibility
- Wire TwoColumnLayout into App and remove old layout
- Replace epic list row layout with icon + slug + phase badge
- Add icon selection logic tests for phase-specific icons

## Fixes

- Fix App.tsx import and component usage for TwoColumnLayout

## Full Changelog

- `2fe54c9` design(dashboard-fullheight-redesign): checkpoint
- `23de7cf` design(dashboard-fullheight-redesign): checkpoint
- `f07187b` plan(dashboard-fullheight-redesign): checkpoint
- `1f4ffa7` feat(epic-list-icons): add icon selection logic tests
- `d059ae2` feat(two-column-layout): add backgroundColor prop to PanelBox
- `7680638` feat(epic-list-icons): replace row layout with icon + slug + phase badge
- `4138590` feat(two-column-layout): create TwoColumnLayout component
- `33f41c1` feat(two-column-layout): wire TwoColumnLayout into App and remove old layout
- `e0b634a` fix(two-column-layout): update App.tsx import and component usage
- `5a86ae2` implement(dashboard-fullheight-redesign-epic-list-icons): checkpoint
- `03cbae6` implement(dashboard-fullheight-redesign-two-column-layout): checkpoint
- `0290828` validate(dashboard-fullheight-redesign): checkpoint
