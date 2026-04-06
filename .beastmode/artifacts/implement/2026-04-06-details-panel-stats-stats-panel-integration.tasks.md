# Stats Panel Integration — Tasks

## Goal

Wire the stats accumulator into the dashboard's details panel content resolution and rendering pipeline.

## Architecture

- `DetailsContentResult` union with `kind: "stats"` variant carrying `SessionStats`
- `resolveDetailsContent` returns stats when selection is `{ kind: "all" }` and stats provided
- `SessionStatsAccumulator` instantiated in App component, subscribed to WatchLoop EventEmitter
- `DetailsPanel` renders three stacked sections (Sessions, Phase Duration, Retries)
- Empty state: dim "waiting for sessions..." placeholder
- Duration formatting via `formatDuration` utility

## Tech Stack

- TypeScript, React (Ink), vitest, Cucumber BDD
- Bun runtime

## File Structure

- `cli/src/dashboard/details-panel.ts` — StatsContent type, resolveDetailsContent with stats handling
- `cli/src/dashboard/DetailsPanel.tsx` — Rendering with 3 sections and empty state
- `cli/src/dashboard/App.tsx` — Accumulator wiring with EventEmitter subscriptions
- `cli/src/dashboard/session-stats.ts` — SessionStatsAccumulator module
- `cli/src/dashboard/format-duration.ts` — Duration formatting utility
- `cli/src/__tests__/details-panel.test.ts` — Unit tests for content resolution
- `cli/src/__tests__/session-stats.test.ts` — Accumulator unit tests
- `cli/src/__tests__/format-duration.test.ts` — Duration formatting tests
- `cli/features/stats-panel-integration.feature` — BDD feature file
- `cli/features/step_definitions/stats-panel.steps.ts` — Step definitions
- `cli/features/support/stats-panel-world.ts` — Test world
- `cli/features/support/stats-panel-hooks.ts` — Test hooks
- `cli/cucumber.json` — Profile for stats-panel BDD

## Status

All implementation was delivered in wave 1 (stats-accumulator feature). This wave 2 feature verified that all components are correctly wired and all tests pass.

- [x] **Task 0: Verify BDD integration tests pass**
- [x] **Task 1: Verify unit tests pass (43/43)**
- [x] **Task 2: Verify acceptance criteria coverage**
