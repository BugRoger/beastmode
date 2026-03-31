---
phase: release
slug: github-sync-watch-loop
bump: minor
---

# Release: github-sync-watch-loop

**Version:** v0.52.0
**Date:** 2026-03-31

## Highlights

Wires GitHub sync into the autonomous watch loop so the project board reflects actual epic state after pipeline execution. Adds cancelled phase handling and extracts a shared sync helper used by both manual and watch-loop paths.

## Features

- **Watch loop sync** — reconcileState() now calls syncGitHubForEpic() after persistence, with discovery cached once per scan cycle and per-epic logger support
- **Sync helper extraction** — new syncGitHubForEpic() in github-sync.ts encapsulates the full sync lifecycle (config → discover → sync → apply mutations → warn-and-continue), replacing the inline block in post-dispatch.ts
- **Cancelled phase sync** — cancelled epics map to Done board column, get phase/cancelled label, and close on GitHub just like done epics

## Chores

- Design, plan, and validation artifacts for github-sync-watch-loop
- Context tree compaction: removed 24 pure-restatement L3 files

## Full Changelog

- `eea3e14` validate(github-sync-watch-loop): checkpoint
- `7e86339` implement(watch-loop-sync): checkpoint
- `7e3da72` implement(sync-helper-extract): checkpoint
- `aef11cf` implement(cancelled-phase-sync): checkpoint
- `8a4949f` plan(github-sync-watch-loop): checkpoint
- `714f9d3` design(github-sync-watch-loop): checkpoint
- `fd09d2e` Context tree compaction: remove 24 pure-restatement L3 files
