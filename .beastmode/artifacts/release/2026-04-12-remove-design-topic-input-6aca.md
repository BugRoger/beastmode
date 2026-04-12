---
phase: release
epic-id: remove-design-topic-input-6aca
epic-slug: remove-design-topic-input-6aca
bump: minor
---

# Release: remove-design-topic-input-6aca

**Bump:** minor
**Date:** 2026-04-12

## Highlights

Removes the unused `[topic]` positional argument from `beastmode design`. The design skill's Phase 0 interview is now the sole entry point for problem framing — no more typing your problem twice.

## Features

- Remove design args branch in phase command; design always passes empty slug (7cfe1ae0)
- Add args rejection guard: `beastmode design something` now errors with a clear message and exits (7cfe1ae0, 73a047b2)
- Update CLI help text to show `beastmode design` without `[topic]` placeholder (ea8827d3)

## Chores

- Update interactive-runner design fixtures to empty args (f5d7db1e)
- Add args rejection guard tests for design phase (73a047b2)

## Full Changelog

- 8459138d design(jacked-xor-6aca): checkpoint (#539)
- e64b0f17 plan(remove-design-topic-input-6aca): checkpoint (#539)
- ea8827d3 feat(remove-topic-arg): update help text to remove [topic] placeholder (#539)
- 7cfe1ae0 feat(remove-topic-arg): remove design args branch, add rejection guard (#539)
- f5d7db1e test(remove-topic-arg): update interactive-runner design fixtures to empty args (#539)
- 73a047b2 test(remove-topic-arg): add args rejection guard tests for design phase (#539)
- 9670e552 implement(remove-design-topic-input-6aca--remove-topic-arg): checkpoint (#539)
- 02a7ce84 validate(remove-design-topic-input-6aca): checkpoint (#539)
