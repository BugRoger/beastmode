---
phase: release
slug: context-tree-compaction
bump: minor
---

# Release: context-tree-compaction

**Version:** v0.50.0
**Date:** 2026-03-31

## Highlights

Adds prevention and cleanup mechanisms for context tree bloat. Retro walkers now skip L3 records that merely restate their parent L2, and a new compaction agent audits the full tree — removing stale records, folding restatements, and detecting L0 promotion candidates.

## Features

- Retro value-add gate in both walkers (retro-context, retro-meta) — four-criteria check prevents redundant L3 creation at the source
- Compaction agent (`agents/compaction.md`) — three-step algorithm: staleness removal, restatement folding, L0 promotion detection
- `beastmode compact` CLI command — on-demand context tree audit, always runs regardless of release cadence
- Release compaction integration — automatic compaction every 5 releases, runs before retro in checkpoint phase

## Chores

- Design, plan, implement, validate phase artifacts for context-tree-compaction

## Full Changelog

- `350c1eb` design(context-tree-compaction): checkpoint
- `ef13b67` plan(context-tree-compaction): checkpoint
- `ee5a6ea` implement(compaction-agent): checkpoint
- `740a766` implement(compact-cli): checkpoint
- `8d7c57c` implement(release-compaction): checkpoint
- `daa91c9` validate(context-tree-compaction): checkpoint
