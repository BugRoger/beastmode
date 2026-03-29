# Session Strategy

**Design:** `.beastmode/state/design/2026-03-29-cmux-integration-revisited.md`

## User Stories

1. As an operator without cmux installed, I want the existing SDK-based dispatch to work exactly as before so cmux is never a hard dependency (US 6)
2. As an operator, I want to configure the dispatch strategy in config.yaml so I can switch between SDK and cmux dispatch without code changes (US 7)

## What to Build

Extract the current inline dispatch logic from the watch loop into a formal `SessionStrategy` interface with three methods: `dispatch()` to launch a phase/feature session, `isComplete()` to check if a dispatched session has finished, and `cleanup()` to tear down resources when done.

Create an `SdkStrategy` implementation that encapsulates the existing SDK-based dispatch behavior — SDK session creation, promise-based completion tracking, and run logging. This is a pure extraction refactor: no behavioral changes, existing tests must continue to pass.

Create a `SessionFactory` that reads the `cli.dispatch-strategy` config field and returns the appropriate strategy. The factory must also accept a runtime availability check (for cmux ping) to support the `auto` mode. Values: `sdk` (always SDK), `cmux` (always cmux, error if unavailable), `auto` (cmux if available, SDK fallback).

Extend the `BeastmodeConfig` type to include `cli.dispatch-strategy` with the three valid values. The config parser must default to `sdk` when the field is absent (backwards compatibility).

Wire the watch loop to obtain a strategy from the factory and call strategy methods instead of the current inline dispatch logic. The `WatchDeps` interface may need adjustment to accommodate strategy injection.

Introduce the `.dispatch-done.json` marker file contract: `phaseCommand` writes this file to the worktree path on exit with `{ exitCode, costUsd, durationMs, sessionId, timestamp }`. `SdkStrategy` resolves its in-process promise AND writes the marker. This universal marker enables the cmux strategy in a later feature.

## Acceptance Criteria

- [ ] `SessionStrategy` interface defined with `dispatch()`, `isComplete()`, `cleanup()` methods
- [ ] `SdkStrategy` passes all existing SDK dispatch tests unchanged
- [ ] `SessionFactory` returns correct strategy for `sdk`, `cmux`, `auto` config values
- [ ] `cli.dispatch-strategy` config field parsed with `sdk` default
- [ ] Watch loop uses strategy methods instead of inline dispatch
- [ ] `phaseCommand` writes `.dispatch-done.json` marker on exit (success, error, cancellation)
- [ ] Marker file schema validated in tests
- [ ] No behavioral regression in existing watch loop tests
