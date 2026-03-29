# Commit Format

## Context
Release commits on main need a consistent, scannable format so `git log --oneline main` reads as a release history.

## Decision
Release commits use `Release vX.Y.Z — Title` with em dash (not hyphen). Body contains Highlights (always first), applicable category sections (Features/Fixes/Docs/Chores/Breaking Changes), and Full Changelog (always last). One commit per version on main via squash merge. Title subtitle uses "The Noun" pattern for thematic releases.

## Rationale
GitHub release style messages are familiar and information-dense. Em dash distinguishes release commits from regular commits at a glance. "The Noun" subtitles (The Cleanup, The Reconciler, The Banner Fix) make `git log` scannable. Categorized body enables automated changelog extraction. Squash merge keeps main linear.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.2.1.md (format established)
- .beastmode/artifacts/release/2026-03-05-v0.11.0.md (GitHub release style)
- .beastmode/artifacts/release/2026-03-06-v0.14.6.md (The Banner Fix — "The Noun" pattern)
