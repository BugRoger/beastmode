---
phase: plan
epic-id: bm-3459
epic-slug: dashboard-spinner-bug-fixes-3459
epic-name: Dashboard Spinner Bug Fixes
---

# Plan Manifest

**Design:** .beastmode/artifacts/design/2026-04-12-dashboard-spinner-bug-fixes-3459.md

## Features

| Ordinal | Feature | Wave | Stories | Plan |
|---------|---------|------|---------|------|
| 1 | spinner-shared-module | 1 | US 1, 2, 3 | 2026-04-12-dashboard-spinner-bug-fixes-3459--spinner-shared-module.1.md |

## Architectural Decisions

| Decision | Choice |
|----------|--------|
| Shared module location | New file `cli/src/dashboard/spinner.ts` |
| Shared exports | `EPIC_SPINNER`, `FEATURE_SPINNER`, `SPINNER_INTERVAL_MS`, `useSpinnerTick`, `isActive` |
| Hook name | `useSpinnerTick` (unified) |
| Spinner activation | Phase-based `isActive(status)` everywhere |
| `activeSessions` prop | Preserved — still used for view filtering |
