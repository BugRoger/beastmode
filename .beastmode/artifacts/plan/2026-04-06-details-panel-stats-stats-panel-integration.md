---
phase: plan
slug: 7c2042
epic: details-panel-stats
feature: stats-panel-integration
wave: 2
---

# Stats Panel Integration

**Design:** `.beastmode/artifacts/design/2026-04-06-7c2042.md`

## User Stories

1. As a user viewing the dashboard with "(all)" selected, I want to see session stats (total count, active count, success rate, uptime, cumulative session time), so that I understand pipeline throughput at a glance.

2. As a user viewing the dashboard with "(all)" selected, I want to see average phase duration broken down by phase (plan, implement, validate, release) with phase-colored names, so that I can identify slow phases and performance trends.

3. As a user viewing the dashboard with "(all)" selected, I want to see retry stats (total re-dispatches and total failures), so that I can gauge pipeline reliability during this session.

4. As a user who just started the dashboard with no completed sessions, I want to see a dim "waiting for sessions..." placeholder instead of zeros, so that the panel communicates its purpose before data arrives.

## What to Build

Wire the stats accumulator (from wave 1) into the dashboard's details panel content resolution and rendering pipeline.

**Type system changes:**
- Add a new `kind: "stats"` variant to the `DetailsContentResult` discriminated union, carrying the `SessionStats` snapshot as its payload
- Update the content resolution function (`resolveDetailsContent`) to return the stats variant when selection is `{ kind: "all" }` and a stats accumulator is available

**App-level wiring:**
- Instantiate the stats accumulator in the App component (or a parent provider), passing the WatchLoop's EventEmitter
- Pass the accumulator (or its current stats snapshot) down to the content resolution layer so `resolveDetailsContent` can produce the stats content variant
- The accumulator instance lives for the dashboard's lifetime — created once, never recreated

**DetailsPanel rendering:**
- Add a branch in the DetailsPanel component to handle `kind: "stats"` content
- Render three stacked sections with bold headers matching the existing panel style:
  1. **Sessions** — total count, active count, success rate (percentage), uptime (formatted duration), cumulative session time (formatted duration)
  2. **Phase Duration** — four rows (plan, implement, validate, release), each with phase name in its `PHASE_COLOR` and average duration (or "--" for unseen phases)
  3. **Retries** — total re-dispatches, total failures

**Empty state:**
- When the accumulator reports `isEmpty`, render a single dim "waiting for sessions..." line using the muted color from `CHROME` palette instead of the three sections

**Duration formatting:**
- Format millisecond durations into human-readable strings (e.g., "2m 30s", "1h 15m"). Follow existing formatting conventions in `overview-panel.ts` if a duration formatter already exists; otherwise introduce a small formatting utility

**Existing behavior preservation:**
- Epic and feature selection paths remain unchanged — they still resolve to artifact or not-found content
- The overview panel (left side) is unaffected
- All existing details panel tests must continue to pass

## Integration Test Scenarios

```gherkin
@details-panel-stats
Feature: Details panel displays session stats when all epics are selected

  The details panel renders a stats view with three stacked sections
  when the user selects "(all)" in the epics list. The sections show
  session stats, phase duration breakdown, and retry stats.

  Background:
    Given the dashboard is running
    And the user has selected "(all)" in the epics list

  Scenario: Session stats section displays total and active counts
    Given several sessions have completed
    Then the details panel shows a "Sessions" section
    And the sessions section displays the total session count
    And the sessions section displays the active session count

  Scenario: Session stats section displays success rate
    Given several sessions have completed with mixed outcomes
    Then the sessions section displays the success rate as a percentage

  Scenario: Session stats section displays uptime
    Given the dashboard has been running for some time
    Then the sessions section displays the uptime duration

  Scenario: Session stats section displays cumulative session time
    Given several sessions have completed
    Then the sessions section displays the cumulative session time

  Scenario: Phase duration section shows average duration per phase
    Given sessions have completed phases with recorded durations
    Then the details panel shows a "Phase Duration" section
    And the phase duration section lists all four phases:
      | phase     |
      | plan      |
      | implement |
      | validate  |
      | release   |

  Scenario: Phase names are displayed with phase-specific colors
    Given sessions have completed phases with recorded durations
    Then each phase name in the duration breakdown uses its designated phase color

  Scenario: Unseen phases display a placeholder instead of a duration
    Given only the "plan" phase has recorded durations
    Then the "implement" phase displays a no-data indicator
    And the "validate" phase displays a no-data indicator
    And the "release" phase displays a no-data indicator

  Scenario: Retry stats section displays re-dispatch and failure counts
    Given sessions have experienced re-dispatches and failures
    Then the details panel shows a "Retries" section
    And the retries section displays the total re-dispatch count
    And the retries section displays the total failure count

  Scenario: Empty state shows placeholder before any session completes
    Given no sessions have completed yet
    Then the details panel shows a dim "waiting for sessions..." placeholder
    And the details panel does not show numeric stats

  Scenario: Placeholder disappears after first session completes
    Given no sessions have completed yet
    When the first session completes
    Then the details panel replaces the placeholder with session stats

  Scenario: Stats view only appears for the all-epics selection
    Given the user has selected a specific epic instead of "(all)"
    Then the details panel does not show the stats view
    And the details panel shows the epic detail content instead

  Scenario: Three sections are stacked vertically in order
    Given sessions have completed with stats available
    Then the details panel displays sections in this order:
      | section        |
      | Sessions       |
      | Phase Duration |
      | Retries        |
```

## Acceptance Criteria

- [ ] `DetailsContentResult` union includes a `kind: "stats"` variant carrying `SessionStats`
- [ ] `resolveDetailsContent` returns stats content when selection is `{ kind: "all" }` and stats are available
- [ ] Stats accumulator instantiated in App component, connected to WatchLoop EventEmitter
- [ ] DetailsPanel renders three stacked sections (Sessions, Phase Duration, Retries) for stats content
- [ ] Phase names use `PHASE_COLOR` colors; unseen phases show "--"
- [ ] Empty state renders dim "waiting for sessions..." placeholder
- [ ] Duration values formatted as human-readable strings
- [ ] Epic and feature selection paths unchanged — existing tests pass
- [ ] Component tests verify stats rendering, empty state, and section ordering
