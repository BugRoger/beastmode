# Release Artifact Format

## Context
Each release produces a state artifact at `.beastmode/artifacts/release/`. These documents need a consistent structure for readability and downstream processing by retro agents.

## Decision
Standard structure: `# Release vX.Y.Z — Title` heading, `**Date:**` field, Highlights paragraph (required), then applicable category sections (Features, Fixes, Docs, Chores, Breaking Changes), and Full Changelog (required). Migration releases include a Migration table. Empty sections omitted.

## Rationale
Format evolved organically across v0.1.13-v0.6.x and stabilized by v0.7.0. Highlights-first pattern emerged as most useful for quick scanning. Full Changelog with commit hashes provides traceability. Optional sections prevent boilerplate in small releases.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.1.13.md (early format)
- .beastmode/artifacts/release/2026-03-04-v0.2.0.md (added Migration section)
- .beastmode/artifacts/release/2026-03-05-v0.7.0.md (format stabilized)
- .beastmode/artifacts/release/2026-03-06-v0.14.4.md (current format confirmed)
