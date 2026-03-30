---
phase: plan
epic: status-watch
feature: render-refactor
---

# Render Refactor

**Design:** `.beastmode/artifacts/design/2026-03-30-status-watch.md`

## User Stories

1. As a pipeline operator, I want to run `beastmode status --watch` so that I can see pipeline state updating in real-time without re-running the command.

## What to Build

Extract the table rendering logic in the status command into a pure function that returns a complete rendered string (header + table) instead of printing directly to stdout. The existing `statusCommand` should call this extracted function and print its output (preserving current behavior). Add a watch-mode header line that shows the last-updated timestamp and watch loop running/stopped indicator (via the existing lockfile reader). Wire `--watch` / `-w` flag parsing in `statusCommand` so it can be detected and handed off to the poll loop (built in feature 2).

The render function signature should accept the enriched manifest array, options (all flag), and watch-mode metadata (timestamp, lockfile status) so it can produce the full screen content as a string.

## Acceptance Criteria

- [ ] Table rendering extracted into a pure function returning a string
- [ ] Existing `beastmode status` output is unchanged (no regression)
- [ ] `--watch` / `-w` flag is parsed and recognized by `statusCommand`
- [ ] Watch header line includes human-readable timestamp
- [ ] Watch header line includes "watch: running" or "watch: stopped" based on lockfile
- [ ] Existing status tests still pass
- [ ] New unit tests for the render function and header formatting
