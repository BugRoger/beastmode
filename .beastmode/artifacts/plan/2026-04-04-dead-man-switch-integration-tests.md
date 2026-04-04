---
phase: plan
slug: dead-man-switch
epic: dead-man-switch
feature: integration-tests
wave: 1
---

# Integration Tests

**Design:** `.beastmode/artifacts/design/2026-04-04-dead-man-switch.md`

## User Stories

1. As a pipeline operator, I want crashed iTerm2 sessions to be detected automatically, so that I don't have to manually monitor every dispatched session for silent failures.
2. As a pipeline operator, I want a dead session to be re-dispatched on the next scan cycle, so that epics recover from transient crashes without manual intervention.
3. As a pipeline operator, I want only the specific crashed session to be affected, so that other parallel sessions for different epics or features continue running.
4. As a pipeline operator, I want to see a `session-dead` event in the watch loop log/dashboard, so that I know when a session was detected as dead and recovery was triggered.
5. As a pipeline operator, I want liveness detection to work without any session-side instrumentation, so that existing skills and agents don't need modification.

## What to Build

Behavioral integration test suite for the dead-man-switch epic. Five Gherkin feature files covering: crashed session detection, automatic re-dispatch, session isolation during recovery, session-dead event logging, and instrumentation-free liveness detection.

Step definitions mock the terminal process layer (TTY process tree) and the `It2Client` to simulate alive/dead sessions without requiring actual iTerm2. The test harness uses the same watch loop test infrastructure established by existing `.feature` files (e.g., `watch-loop-happy-path.feature`, `pipeline-error-resilience.feature`).

Scenarios are defined in the integration artifact at `.beastmode/artifacts/plan/2026-04-04-dead-man-switch-integration.md`. The implementer translates each Gherkin scenario into a `.feature` file with corresponding step definitions.

## Acceptance Criteria

- [ ] Scenario: Session that exits cleanly is not flagged as dead
- [ ] Scenario: Session whose terminal process has exited is detected as dead
- [ ] Scenario: Session that is still running is not classified as dead
- [ ] Scenario: Dead session is re-dispatched on next scan cycle
- [ ] Scenario: Re-dispatched session runs the same phase as the crashed session
- [ ] Scenario: Re-dispatched session completes successfully after crash
- [ ] Scenario: Other epic sessions continue when one epic's session dies
- [ ] Scenario: Other feature sessions within same epic continue when one feature session dies
- [ ] Scenario: Multiple simultaneous crashes are each recovered independently
- [ ] Scenario: Dead session emits a session-dead event
- [ ] Scenario: Session-dead event includes the phase that was running
- [ ] Scenario: Session-dead event is followed by a re-dispatch event
- [ ] Scenario: No session-dead event for sessions that complete normally
- [ ] Scenario: Liveness check uses only the terminal process identifier
- [ ] Scenario: Session that produces no output is still detected as alive while process runs
- [ ] Scenario: Session detected as dead only after process actually exits
