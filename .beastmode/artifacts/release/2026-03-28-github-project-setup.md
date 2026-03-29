# Release: github-project-setup

**Version:** v0.23.0
**Date:** 2026-03-28

## Highlights

GitHub Projects V2 board is no longer a decorative placeholder. Setup-github now configures the Pipeline status field, backfills existing issues, and caches project metadata. Every phase checkpoint syncs issues to the board automatically.

## Features

- **Pipeline status field** — Setup-github creates a 7-option Pipeline field (Backlog, Design, Plan, Implement, Validate, Release, Done) with color-coded statuses via GraphQL
- **Project metadata cache** — Setup-github writes `.beastmode/state/github-project.cache.json` with project ID, field ID, and option ID map for downstream checkpoint use
- **Issue backfill** — Setup-github adds all existing `type/epic` and `type/feature` issues to the project with Status derived from their current labels
- **Shared project sync** — New "Add to Project + Set Status" operation in `_shared/github.md` handles idempotent project item addition and status updates
- **Checkpoint project sync** — All 5 phase checkpoints (design, plan, implement, validate, release) now sync Epic and Feature issues to the project board at every transition

## Fixes

- **Cache field name mismatch** — Fixed `pipelineField` vs `statusField` naming inconsistency between cache writer (setup-github) and reader (github.md shared operation)

## Full Changelog

- `47baa1a` plan(github-project-setup): checkpoint
- `204d016` implement(shared-project-sync): checkpoint
- `131b4f9` implement(checkpoint-project-sync): checkpoint
- `0a399bf` implement(setup-status-config): checkpoint
- `3e10969` implement(setup-backfill): checkpoint
- `6548184` Fix cache field name mismatch between writer and reader
