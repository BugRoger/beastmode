---
phase: release
slug: watch-log-format
epic: watch-log-format
bump: minor
---

# Release: watch-log-format

**Bump:** minor
**Date:** 2026-04-03

## Highlights

Restructures the watch log format with fixed-width phase columns, truncated scope names, deduplicated message text, and a costUsd guard — producing clean, vertically-aligned pipeline output.

## Features

- Fixed-width phase column (9 chars) extracted from scope for vertical alignment
- Scope truncation with 32-character budget and trailing ellipsis for long names
- Message deduplication across all log call sites — strips phase/epic/feature info already present in structured prefix
- costUsd guard: undefined cost omitted from completion messages instead of crashing on `.toFixed()`
- Dashboard activity log inherits new format automatically via shared `formatLogLine`

## Full Changelog

- `e64f4ce` design(watch-log-format): checkpoint
- `9c1d86e` design(watch-log-format): checkpoint
- `07e77a0` plan(watch-log-format): checkpoint
- `7a8c4bc` implement(watch-log-format-format-columns): checkpoint
- `dc5c4c9` implement(watch-log-format-dedup-messages): checkpoint
- `7e97908` implement(watch-log-format-cost-guard): checkpoint
- `c521ae5` validate(watch-log-format): checkpoint
