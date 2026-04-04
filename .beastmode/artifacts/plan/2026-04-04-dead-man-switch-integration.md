# Integration Artifact: dead-man-switch

Epic: **dead-man-switch**
Date: 2026-04-04

## Coverage Analysis

Reviewed 13 existing `.feature` files in `cli/features/`. None cover crashed session detection, automatic re-dispatch of dead sessions, session isolation during recovery, session-dead event logging, or instrumentation-free liveness checks. All five user stories produce new scenarios.

### Existing features reviewed (no overlap):

| Feature file | Behavioral domain |
|---|---|
| pipeline-happy-path.feature | Full lifecycle design-to-release |
| pipeline-error-resilience.feature | Dispatch failure / abandonment handling |
| watch-loop-happy-path.feature | Multi-epic parallel dispatch + release serialization |
| wave-failure.feature | Wave ordering enforcement |
| regression-loop.feature | Validate failure triggers re-implement |
| cancel-flow.feature | Mid-pipeline cancellation cleanup |
| design-slug-rename.feature | Hex slug to readable name rename |
| hitl-hook-lifecycle.feature | HITL settings written/cleaned per phase |
| file-permissions-config.feature | File permission prose from config |
| file-permissions-hooks.feature | Write/Edit hook path filtering |
| file-permissions-lifecycle.feature | Hook persistence across phases |
| file-permissions-logging.feature | Permission decisions logged to HITL log |
| dashboard-wiring-fix.feature | ThreePanelLayout rendering |

---

## New Scenarios

### Feature 1: Crashed session detection (User Story 1)

```gherkin
@dead-man-switch
Feature: Crashed session detection -- dead iTerm2 sessions detected automatically

  The watch loop checks liveness of dispatched sessions on each scan cycle.
  A session whose terminal process has exited is classified as dead. Detection
  happens at the watch loop level, not inside the session itself.

  Background:
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And the watch loop is initialized

  Scenario: Session that exits cleanly is not flagged as dead
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the active session for "auth-system" completes successfully
    Then no session-dead event should be emitted for "auth-system"

  Scenario: Session whose terminal process has exited is detected as dead
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the session for "auth-system" should be classified as dead

  Scenario: Session that is still running is not classified as dead
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    Then the session for "auth-system" should be classified as alive
    And no session-dead event should be emitted for "auth-system"
```

### Feature 2: Automatic re-dispatch of dead sessions (User Story 2)

```gherkin
@dead-man-switch
Feature: Dead session re-dispatch -- crashed sessions recover on next scan cycle

  When a session is detected as dead, the watch loop re-dispatches the same
  phase and feature on the next scan cycle. The epic resumes from where it
  was before the crash, not from the beginning of the pipeline.

  Background:
    Given epic "data-pipeline" with features:
      | feature   | wave |
      | ingestion | 1    |
      | transform | 2    |
    And the watch loop is initialized

  Scenario: Dead session is re-dispatched on next scan cycle
    When epic "data-pipeline" is seeded in "design" phase with next action "implement"
    And the watch loop ticks
    And a session is dispatched for "data-pipeline" implement feature "ingestion"
    And the terminal process for "data-pipeline" exits unexpectedly
    And the watch loop ticks
    Then a new session should be dispatched for "data-pipeline" implement feature "ingestion"

  Scenario: Re-dispatched session runs the same phase as the crashed session
    When epic "data-pipeline" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And a session is dispatched for "data-pipeline" plan phase
    And the terminal process for "data-pipeline" exits unexpectedly
    And the watch loop ticks
    Then the re-dispatched session should be for the "plan" phase
    And the manifest phase for "data-pipeline" should still be "plan"

  Scenario: Re-dispatched session completes successfully after crash
    When epic "data-pipeline" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And a session is dispatched for "data-pipeline" plan phase
    And the terminal process for "data-pipeline" exits unexpectedly
    And the watch loop ticks
    And the re-dispatched session completes successfully
    Then the manifest phase for "data-pipeline" should advance past "plan"
```

### Feature 3: Session isolation during recovery (User Story 3)

```gherkin
@dead-man-switch
Feature: Session isolation during recovery -- only the crashed session is affected

  When one session dies in a multi-epic watch loop, other sessions for
  different epics and features continue running unaffected. Recovery
  targets only the specific crashed session.

  Scenario: Other epic sessions continue when one epic's session dies
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And epic "data-pipeline" with features:
      | feature   | wave |
      | ingestion | 1    |
    And the watch loop is initialized
    When both epics are seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the session for "data-pipeline" should still be active
    And a new session should be dispatched for "auth-system"

  Scenario: Other feature sessions within same epic continue when one feature session dies
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
      | login-flow    | 1    |
    And the watch loop is initialized
    When epic "auth-system" is seeded in "design" phase with next action "implement"
    And the watch loop ticks
    And sessions are dispatched for both "auth-provider" and "login-flow"
    And the terminal process for feature "auth-provider" exits unexpectedly
    And the watch loop ticks
    Then the session for feature "login-flow" should still be active
    And a new session should be dispatched for feature "auth-provider"

  Scenario: Multiple simultaneous crashes are each recovered independently
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And epic "data-pipeline" with features:
      | feature   | wave |
      | ingestion | 1    |
    And the watch loop is initialized
    When both epics are seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the terminal process for "data-pipeline" exits unexpectedly
    And the watch loop ticks
    Then a new session should be dispatched for "auth-system"
    And a new session should be dispatched for "data-pipeline"
```

### Feature 4: Session-dead event in watch loop log (User Story 4)

```gherkin
@dead-man-switch
Feature: Session-dead event logging -- dead sessions emit observable events

  When a dead session is detected, the watch loop emits a session-dead event
  that appears in the log stream and dashboard. The event includes enough
  context to identify which epic and phase were affected.

  Background:
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And the watch loop is initialized

  Scenario: Dead session emits a session-dead event
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then a "session-dead" event should be emitted
    And the event should identify epic "auth-system"

  Scenario: Session-dead event includes the phase that was running
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the "session-dead" event should include the phase "plan"

  Scenario: Session-dead event is followed by a re-dispatch event
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then a "session-dead" event should be emitted before the re-dispatch
    And a dispatch event should follow for epic "auth-system"

  Scenario: No session-dead event for sessions that complete normally
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the active session for "auth-system" completes successfully
    Then no "session-dead" event should be emitted
```

### Feature 5: Instrumentation-free liveness detection (User Story 5)

```gherkin
@dead-man-switch
Feature: Instrumentation-free liveness detection -- no session-side changes required

  Liveness detection works by checking whether the terminal process associated
  with a dispatched session still exists. No heartbeat file, no IPC channel,
  no agent-side probe. Existing skills and agents run unmodified.

  Background:
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And the watch loop is initialized

  Scenario: Liveness check uses only the terminal process identifier
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    Then the liveness check for "auth-system" should use only the session process identifier
    And no heartbeat file should exist in the worktree for "auth-system"

  Scenario: Session that produces no output is still detected as alive while process runs
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the session for "auth-system" produces no output for an extended period
    And the terminal process for "auth-system" is still running
    Then the session for "auth-system" should be classified as alive

  Scenario: Session detected as dead only after process actually exits
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    Then the session for "auth-system" should be classified as dead
    And the classification should not depend on session output or artifacts
```

---

## Modified Scenarios

None. No existing scenarios require modification for the dead-man-switch epic.

---

## Deleted Scenarios

None. No existing scenarios are obsoleted by the dead-man-switch epic.
