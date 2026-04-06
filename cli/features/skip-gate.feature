@integration-test-hygiene
Feature: Plan skill skip gate -- integration-tester agent is not dispatched for non-behavioral epics

  The plan skill evaluates each feature's behavioral impact before
  dispatching the plan-integration-tester agent. Features that only
  change documentation, refactor code, modify configuration, or fix
  bugs with existing test coverage produce no new behavioral scenarios
  and should not trigger an agent dispatch. The gate fires per epic:
  if all features are non-behavioral, no integration artifact is produced
  and no integration-tests feature appears in the plan.

  Background:
    Given the plan skill is configured to spawn the plan-integration-tester agent

  Scenario: Documentation-only epic skips integration test generation
    Given an epic whose features only change documentation content
    When the plan phase runs for the epic
    Then the plan-integration-tester agent is not dispatched
    And no integration artifact is produced
    And no integration-tests feature appears in the plan output

  Scenario: Refactoring epic skips integration test generation
    Given an epic whose features only restructure existing code without changing behavior
    When the plan phase runs for the epic
    Then the plan-integration-tester agent is not dispatched
    And no integration artifact is produced

  Scenario: Configuration-change epic skips integration test generation
    Given an epic whose features only change configuration values or schema
    When the plan phase runs for the epic
    Then the plan-integration-tester agent is not dispatched
    And no integration artifact is produced

  Scenario: Bug fix with existing coverage skips integration test generation
    Given an epic whose features fix a known bug
    And existing integration scenarios already cover the affected behavior
    When the plan phase runs for the epic
    Then the plan-integration-tester agent is not dispatched
    And no integration artifact is produced

  Scenario: Epic with at least one behavioral feature dispatches the agent
    Given an epic that mixes a documentation feature and a feature adding new user-visible behavior
    When the plan phase runs for the epic
    Then the plan-integration-tester agent is dispatched
    And only the behavioral features are sent to the agent
    And an integration artifact is produced

  Scenario: Agent dispatch failure does not abort the plan phase
    Given an epic with behavioral features
    And the plan-integration-tester agent reports NEEDS_CONTEXT
    When the plan phase runs for the epic
    Then the plan phase completes successfully
    And a warning is recorded that integration test generation was skipped
    And no integration-tests feature appears in the plan output
