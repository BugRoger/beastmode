---
phase: plan
slug: c8764e
epic: dashboard-stats-persistence
feature: stats-persistence
wave: 1
---

# stats-persistence

**Design:** `.beastmode/artifacts/design/2026-04-11-c8764e.md`

## User Stories

1. As a pipeline operator, I want to see cumulative session statistics across dashboard restarts, so that I can track pipeline health over days and weeks.
3. As a pipeline operator, I want stats to persist on every session completion, so that a crash or kill doesn't lose data from the current session.
4. As a pipeline operator, I want the dashboard to start cleanly even if the stats file is missing or corrupt, so that I never get blocked by stale state.
5. As a pipeline operator, I want to reset all-time stats by deleting a single file, so that I don't need a special command or UI for a rare operation.

## What to Build

A persistence module that sits alongside the existing `SessionStatsAccumulator` and manages reading/writing cumulative stats to a JSON file at `.beastmode/state/dashboard-stats.json`.

**Schema:** The persisted file stores summary-level counters — `total`, `successes`, `failures`, `reDispatches`, `cumulativeMs` (scalar counters), `phaseDurations` as `{ [phase]: { avgMs: number, count: number } }` (incremental averages), `completedKeys` as `string[]` (for cross-session re-dispatch detection), and `schemaVersion` (integer for forward compatibility). No raw duration arrays — phase averages use incremental formula `(oldAvg * oldCount + newVal) / (oldCount + 1)`.

**Flush:** On every `session-completed` event, the persistence module merges the new event's data into the persisted stats and writes the file synchronously. The file is ~1KB, so I/O cost is negligible.

**Load:** On dashboard startup, the persistence module reads the file and returns a `SessionStats`-compatible snapshot as historical stats. The dashboard creates a fresh `SessionStatsAccumulator` for the current session. The two stat sets remain independent — never merged in memory.

**Graceful degradation:** Missing file produces empty historical stats. Corrupt or unparseable file logs a warning and treats as missing. Schema version mismatch (future) also treats as missing with a warning. No blocking errors under any circumstance.

**Reset:** Manual deletion of `dashboard-stats.json` is the only reset mechanism. No UI or CLI command needed — deleting the file and restarting the dashboard produces a clean slate.

**Wiring:** The dashboard entry point (or App component) initializes the persistence module, loads historical stats into state, and subscribes the persistence module to `session-completed` events for ongoing flushes.

## Integration Test Scenarios

```gherkin
@dashboard-stats-persistence @dashboard
Feature: Dashboard stats persistence -- cumulative statistics survive restarts

  Background:
    Given the dashboard stats persistence layer is initialized

  Scenario: Cumulative stats are available after dashboard restart
    Given a previous dashboard session completed 5 sessions with 4 successes
    When the dashboard restarts and loads persisted stats
    Then the all-time total session count is 5
    And the all-time success rate is 80 percent

  Scenario: Current session stats accumulate independently from persisted stats
    Given a previous dashboard session completed 3 sessions with 3 successes
    When the dashboard restarts and loads persisted stats
    And 2 new sessions complete with 1 success and 1 failure
    Then the all-time total session count is 5
    And the all-time success rate is 80 percent
    And the current session total count is 2
    And the current session success rate is 50 percent

  Scenario: Phase duration averages accumulate across restarts
    Given a previous dashboard session recorded average plan duration of 30 seconds over 4 sessions
    When the dashboard restarts and loads persisted stats
    And a new session completes the "plan" phase in 50 seconds
    Then the all-time average duration for the "plan" phase reflects all 5 sessions
```

```gherkin
@dashboard-stats-persistence @dashboard
Feature: Dashboard stats persistence -- stats persist on session completion

  Scenario: Stats are persisted when a pipeline session completes
    Given the dashboard is running with persistence enabled
    When a pipeline session completes successfully
    Then the persisted stats reflect the completed session

  Scenario: Stats persisted mid-run survive an unclean shutdown
    Given the dashboard is running with persistence enabled
    And 3 pipeline sessions have completed
    When the dashboard process terminates unexpectedly
    And the dashboard restarts and loads persisted stats
    Then the all-time total session count is 3
```

```gherkin
@dashboard-stats-persistence @dashboard
Feature: Dashboard stats persistence -- graceful recovery from missing or corrupt state

  Scenario: Dashboard starts cleanly when no stats file exists
    Given no persisted stats file exists
    When the dashboard starts
    Then the dashboard displays empty all-time stats
    And the dashboard is fully operational

  Scenario: Dashboard starts cleanly when stats file is corrupt
    Given the persisted stats file contains invalid data
    When the dashboard starts
    Then the dashboard discards the corrupt data
    And the dashboard displays empty all-time stats
    And the dashboard is fully operational
```

```gherkin
@dashboard-stats-persistence @dashboard
Feature: Dashboard stats persistence -- reset by file deletion

  Scenario: Deleting the stats file resets all-time statistics
    Given the dashboard has accumulated all-time stats over multiple sessions
    When the operator deletes the persisted stats file
    And the dashboard restarts
    Then the dashboard displays empty all-time stats
    And no special command or UI action was required
```

## Acceptance Criteria

- [ ] Persistence module writes `dashboard-stats.json` on every `session-completed` event
- [ ] Schema includes `total`, `successes`, `failures`, `reDispatches`, `cumulativeMs`, `phaseDurations` (incremental averages), `completedKeys`, and `schemaVersion`
- [ ] Dashboard loads persisted stats on startup as historical/all-time stats
- [ ] Fresh `SessionStatsAccumulator` tracks current session independently
- [ ] Missing stats file produces empty historical stats without error
- [ ] Corrupt stats file logs warning and produces empty historical stats
- [ ] Deleting the file and restarting resets all-time stats to zero
- [ ] Incremental average formula produces correct rolling averages across restarts
- [ ] `completedKeys` persists for cross-session re-dispatch detection
- [ ] Unit tests cover round-trip serialization, incremental averages, and graceful degradation
