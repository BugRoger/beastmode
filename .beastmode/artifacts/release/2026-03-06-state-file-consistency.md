# Release: state-file-consistency

**Version:** v0.14.15
**Date:** 2026-03-06

## Highlights

Unified state file naming so all phases use `YYYY-MM-DD-<feature>.md`. Release files renamed from version-based to feature-based names, validate date format fixed, skill templates updated.

## Chores

- Renamed 51 release state files from version-based (`v0.3.7.md`) to feature-based (`release-version-sync.md`) naming
- Renamed 5 validate state files from `YYYYMMDD-` to `YYYY-MM-DD-` date format
- Updated release skill template to save as `YYYY-MM-DD-<feature>.md` with `**Version:**` metadata field
- Updated validate skill template to use `YYYY-MM-DD-<feature>.md` save path
- Updated retro shared module L0 proposal path to feature-based naming
- Fixed title mismatch in lean-prime release doc (`v0.3.4` → `v0.3.2`)
