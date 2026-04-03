---
phase: plan
slug: remove-cost-tracking
epic: remove-cost-tracking
feature: strip-cost-code
wave: 1
---

# Strip Cost Code

**Design:** `.beastmode/artifacts/design/2026-04-03-remove-cost-tracking.md`

## User Stories

1. As a pipeline operator, I want the watch loop output to not show `$0.00` on every completion, so that the output only contains meaningful information.
2. As a developer, I want `SessionResult`, `PhaseResult`, and `CompletionEntry` to not carry dead `costUsd` fields, so that the type system reflects actual capabilities.
4. As a contributor, I want `.beastmode-runs.json` removed from `.gitignore`, so that there are no references to an unimplemented concept.

## What to Build

Remove all cost-tracking plumbing from the pipeline code, types, display logic, and test fixtures.

**Type definitions:** Strip `costUsd` from `SessionResult`, `SessionCompletedEvent`, and `CompletionEntry`. Strip `cost_usd` from `PhaseResult`. Leave `SDKResultMessage.cost_usd` untouched — it describes the upstream SDK data contract.

**Session dispatch:** Remove `costUsd: 0` hardcodes from cmux and iTerm2 session factories. Remove `cost_usd: null` from the interactive runner. Remove cost capture logic from the watch command's SDK streaming and CLI fallback paths.

**Display layer:** Remove `$X.XX` cost formatting from the watch loop completion listener. Remove cost display from the dashboard activity log.

**SDK message mapper:** Remove `costUsd` from the completion entry mapping. The mapper still processes SDK messages — it just no longer extracts cost.

**Test fixtures:** Remove all mock `costUsd` and `cost_usd` values from test data across watch, SDK mapper, event, wave dispatch, race, and interactive runner tests.

**Configuration:** Remove `.beastmode-runs.json` from `.gitignore`.

**Verification:** After all removals, grep the entire codebase for `costUsd`, `cost_usd`, `cost_Usd`, `costUSD`, and `.beastmode-runs` to confirm no references remain (excluding `SDKResultMessage`). TypeScript compilation must pass cleanly.

## Acceptance Criteria

- [ ] `SessionResult`, `SessionCompletedEvent`, `CompletionEntry` have no `costUsd` field
- [ ] `PhaseResult` has no `cost_usd` field
- [ ] `SDKResultMessage.cost_usd` is unchanged
- [ ] No `costUsd: 0` hardcodes in cmux or iTerm2 session factories
- [ ] No `cost_usd: null` in interactive runner
- [ ] Watch loop completion output contains no `$X.XX` cost string
- [ ] Dashboard activity log contains no cost display
- [ ] All test files compile and pass without cost-related fields
- [ ] `.beastmode-runs.json` is not in `.gitignore`
- [ ] Grep for cost-related identifiers returns zero hits (excluding SDKResultMessage)
- [ ] `tsc --noEmit` passes cleanly
