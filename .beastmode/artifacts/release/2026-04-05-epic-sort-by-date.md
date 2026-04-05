---
phase: release
slug: "535844"
epic: epic-sort-by-date
bump: minor
---

# Release: epic-sort-by-date

**Version:** v0.97.0
**Date:** 2026-04-05

## Highlights

Epics panel now sorts epics by date (most recent first) using a deterministic `compareEpics` comparator that orders by latest commit timestamp, falling back to slug for ties.

## Features

- feat(sort-epics-by-date): add compareEpics and sort in listEnrichedFromStore

## Fixes

- fix(sort-epics-by-date): fix TS cast in integration test

## Full Changelog

- 8a4d420c validate(epic-sort-by-date): checkpoint
- 4251e563 implement(epic-sort-by-date-sort-epics-by-date): checkpoint
- ad58abc0 fix(sort-epics-by-date): fix TS cast in integration test
- ebe49dac test(sort-epics-by-date): update epics-panel test helpers for date sort contract
- 197080a9 feat(sort-epics-by-date): add compareEpics and sort in listEnrichedFromStore
- 519d33ef test(sort-epics-by-date): add integration test — RED
- 92783a9b plan(epic-sort-by-date): checkpoint
- 73a032ed design(epic-sort-by-date): checkpoint
