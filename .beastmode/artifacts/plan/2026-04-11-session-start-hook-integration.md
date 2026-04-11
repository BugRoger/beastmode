# Integration Test Artifact: session-start-hook

## New Scenarios

### Feature: hook-implementation

Covers user stories [1, 2, 3, 6].

```gherkin
@session-start-hook @hooks
Feature: Session start hook context injection -- phase context and parent artifacts injected before session

  Background:
    Given the session-start hook is configured for the pipeline

  Scenario Outline: Hook injects phase context and parent artifacts for each phase
    Given an epic at the "<phase>" phase with required parent artifacts available
    When the session-start hook runs for the "<phase>" phase
    Then the hook output should contain the L0 context
    And the hook output should contain the L1 context for "<phase>"
    And the hook output should contain the resolved parent artifacts for "<phase>"

    Examples:
      | phase     |
      | design    |
      | plan      |
      | implement |
      | validate  |
      | release   |

  Scenario: Design phase injects context without parent artifacts
    Given an epic at the "design" phase
    When the session-start hook runs for the "design" phase
    Then the hook output should contain the L0 context
    And the hook output should contain the L1 context for "design"
    And the hook output should not contain any parent artifacts

  Scenario: Plan phase injects the design PRD as parent artifact
    Given an epic at the "plan" phase with a design artifact available
    When the session-start hook runs for the "plan" phase
    Then the hook output should contain the design artifact content
    And the hook output should contain the L1 context for "plan"

  Scenario: Implement phase injects the feature plan as parent artifact
    Given an epic at the "implement" phase with a feature plan artifact available
    When the session-start hook runs for the "implement" phase
    Then the hook output should contain the feature plan artifact content
    And the hook output should contain the L1 context for "implement"
```

```gherkin
@session-start-hook @hooks
Feature: Session start hook fail-fast -- missing inputs abort session start

  Scenario: Missing phase environment variable causes hook failure
    Given the epic environment variable is set
    And the phase environment variable is not set
    When the session-start hook runs
    Then the hook should exit with a non-zero status
    And the session should not start

  Scenario: Missing epic environment variable causes hook failure
    Given the phase environment variable is set
    And the epic environment variable is not set
    When the session-start hook runs
    Then the hook should exit with a non-zero status
    And the session should not start

  Scenario: Missing context file causes hook failure
    Given all required environment variables are set
    And the L1 context file for the phase does not exist
    When the session-start hook runs
    Then the hook should exit with a non-zero status
    And the session should not start

  Scenario: Missing required parent artifact causes hook failure
    Given an epic at the "plan" phase
    And no design artifact exists for the epic
    When the session-start hook runs for the "plan" phase
    Then the hook should exit with a non-zero status
    And the session should not start
```

```gherkin
@session-start-hook @pipeline
Feature: Session start hook gate injection -- gate status passed through to skills

  Scenario: Gate status for all-features-implemented is injected into context
    Given an epic at the "validate" phase
    And all features have status "completed"
    When the session-start hook runs for the "validate" phase
    Then the hook output should contain the gate status section
    And the gate status should indicate all features are implemented

  Scenario: Gate failure is injected without blocking session start
    Given an epic at the "validate" phase
    And some features have status "pending"
    When the session-start hook runs for the "validate" phase
    Then the hook output should contain the gate status section
    And the gate status should indicate incomplete features
    And the hook should exit successfully
```

### Feature: cli-integration

Covers user stories [5].

```gherkin
@session-start-hook @config
Feature: Session start hook registration -- hook registered in settings alongside existing hooks

  Background:
    Given the pipeline runner is configured for a phase dispatch

  Scenario: Session-start hook is present in settings after dispatch setup
    When settings are written for a pipeline dispatch
    Then the worktree settings should contain a SessionStart hook entry
    And the SessionStart hook should use the portable CLI invocation pattern
    And existing PreToolUse hooks should remain intact
    And existing PostToolUse hooks should remain intact
    And existing Stop hooks should remain intact

  Scenario: Session-start hook is cleaned and rewritten between dispatches
    When settings are written for a "design" phase dispatch
    And settings are rewritten for a "plan" phase dispatch
    Then the worktree settings should contain exactly one SessionStart hook entry
    And the SessionStart hook should reference the current phase

  Scenario: Both manual pipeline and watch loop share the same hook setup
    Given the manual pipeline dispatch path
    When settings are written for a dispatch
    Then the settings should include the SessionStart hook

    Given the watch loop dispatch path
    When settings are written for a dispatch
    Then the settings should include the SessionStart hook
    And the SessionStart hook format should match the manual pipeline format
```

## Consolidation

No consolidation actions identified.

The existing hook-related feature files (`hitl-hook-lifecycle.feature`, `static-hitl-hooks.feature`, `portable-settings.feature`, `file-permissions-hooks.feature`, `file-permissions-lifecycle.feature`, `file-permissions-config.feature`, `file-permissions-logging.feature`) cover HITL PreToolUse/PostToolUse and file-permission hooks exclusively. The session-start-hook epic introduces a new hook event type (`SessionStart`) that is orthogonal to the existing hook scenarios. No existing scenarios test SessionStart behavior, and no existing scenarios are made stale by its introduction -- the existing HITL and file-permission hook lifecycle remains unchanged.
