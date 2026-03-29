# Consolidated Changelog

## Context
Individual release artifacts are fine for per-release detail, but users and contributors need a single scannable document covering the full release history.

## Decision
CHANGELOG.md at repo root consolidates multiple releases into scannable entries. Related minor releases grouped. Version titles include personality matching the `Release vX.Y.Z — Title` convention. README links to the changelog.

## Rationale
Follows high-star GitHub changelog patterns. Consolidating related minors (e.g., 18 releases into 10 entries) prevents changelog fatigue while preserving key information. Introduced in v0.6.0.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.6.0.md (introduced CHANGELOG.md)
