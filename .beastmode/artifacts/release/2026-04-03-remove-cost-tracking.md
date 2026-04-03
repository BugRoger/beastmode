---
phase: release
slug: remove-cost-tracking
epic: remove-cost-tracking
bump: patch
---

# Release: remove-cost-tracking

**Bump:** patch
**Date:** 2026-04-03

## Highlights

Remove dead cost-tracking plumbing that always displayed `$0.00` across the pipeline. Strips fields, display logic, types, and documentation references while preserving the upstream SDK contract (`SDKResultMessage.cost_usd`).

## Chores

- Remove `costUsd` from `SessionResult`, `CompletionEntry`, and watch loop output formatting
- Remove `cost_usd` from `PhaseResult` and interactive runner
- Remove `costUsd: 0` hardcodes from cmux and iTerm2 session adapters
- Remove cost capture logic from watch command (SDK and CLI paths)
- Delete `context/design/state-scanner/cost-separation.md`
- Remove cost references from DESIGN.md and CLI context docs
- Remove `.beastmode-runs.json` from `.gitignore`

## Full Changelog

- `design(remove-cost-tracking): checkpoint` (x2)
- `plan(remove-cost-tracking): checkpoint`
- `implement(remove-cost-tracking-strip-cost-docs): checkpoint`
- `implement(remove-cost-tracking-strip-cost-code): checkpoint`
- `validate(remove-cost-tracking): checkpoint`
