# Implementation Deviations: test-rewrite

**Date:** 2026-03-29
**Feature Plan:** .beastmode/state/plan/2026-03-29-status-unfuckery-v2-test-rewrite.md
**Tasks completed:** 4/4
**Deviations:** 9 total

## Auto-Fixed
- Task 0: `writePipelineManifest` helper needed `phase` param — source already rewritten with mandatory phase field
- Task 0: `scanEpics` returns `ScanResult` not `EpicState[]` — all tests destructured
- Task 0: `EpicState` fields removed (`designPath`, `lastUpdated`, `costUsd`, `gateBlocked`) — tests updated
- Task 0: Added `slugFromManifest` and `validateManifest` unit tests — new exports
- Task 0: Release phase behavior changed (no `hasOutputJson` gate) — test updated
- Task 0: Cost aggregation removed from scanner — tests removed
- Task 1: `status.ts` fully refactored (new interface, ANSI colors, phase sorting) — all 18 tests written against actual API
- Task 2: `manifestDir` export removed, `manifestPath` returns `string | undefined` (flat-file convention) — tests rewritten

## Blocking
None.

## Architectural
None.

**Summary:** 9 auto-fixed, 0 blocking, 0 architectural
