# Release: status-unfuckery-v2

**Version:** v0.41.0
**Date:** 2026-03-29

## Highlights

Complete overhaul of the state scanner, status command, and supporting infrastructure. Pipeline manifests become the sole source of epic discovery, eliminating 118 zombie epics. Shared validation schema enforces manifest structure for both reading and writing.

## Features

- **Pipeline-only discovery** — Scanner reads pipeline/ manifests exclusively; design-file-based discovery removed, dropping ~118 zombie epics from status output
- **Manifest.phase authority** — Phase derivation reads `manifest.phase` directly; missing or invalid phase causes strict reject (manifest skipped entirely)
- **Shared manifest validation schema** — Zod-style TypeScript validator used by both scanner (read) and reconciler (write); required fields: phase, design, features, lastUpdated
- **Single EpicState type** — Canonical interface in state-scanner.ts; watch-types.ts duplicate deleted
- **Unified blocked field** — Single `blocked: boolean` replaces gateBlocked/blockedGate/gateName; status shows `run beastmode <phase> <slug>` when blocked
- **Compact status table** — Redesigned output: Epic | Phase | Features (done/total) | Status with color-coded output
- **--verbose flag** — Surfaces skipped manifests and validation errors for diagnostic visibility
- **Feature status validation** — Rejects unknown status values instead of casting any string
- **Cost tracking removed** — Removed costUsd, aggregateCost, readRunLog from scanner and status output
- **Test suite rewrite** — 362 tests, 728 assertions across 20 files; comprehensive coverage of new scanner, status formatters, and manifest validation

## Full Changelog

- eaa06cc design(status-unfuckery-v2): checkpoint
- edd6967 plan(status-unfuckery-v2): checkpoint
- dac0095 implement(test-rewrite): checkpoint
- 8cc547a implement(scanner-overhaul): checkpoint
- 2d00cc8 implement(status-redesign): checkpoint
- d243b0f implement(manifest-schema): checkpoint
- 34781cf validate(status-unfuckery-v2): checkpoint
