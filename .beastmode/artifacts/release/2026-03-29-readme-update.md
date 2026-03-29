---
phase: release
slug: readme-update
bump: patch
---

# Release: readme-update

**Version:** v0.44.2
**Date:** 2026-03-29

## Highlights

Fix stale information in README.md and ROADMAP.md that drifted from actual project state since v0.44.0. Config example now shows real gate names, domain list is accurate, ROADMAP reflects shipped vs. upcoming features, and a "What Beastmode Is NOT" positioning section clarifies scope.

## Docs

- Fix config.yaml example in README — replace fictional gate names with actual gates, remove deleted `transitions:` block
- Correct domain description to three domains: Artifacts, Context, Meta
- Add "What Beastmode Is NOT" section after "Why?" in README
- Update ROADMAP "Now" — add CLI orchestrator, cmux integration, GitHub state model, terminal phase states, manifest split, demo recording
- Update ROADMAP "Now" — remove shipped/deleted items (phase auto-chaining, visual language spec)
- Update ROADMAP "Next"/"Later" to reflect current project state

## Full Changelog

- `b5ba665` design(readme-update): checkpoint
- `81e6318` plan(readme-update): checkpoint
- `3c6330c` implement(readme-fix): checkpoint
- `f4a9781` validate(readme-update): checkpoint
- `28de728` release(readme-update): checkpoint
