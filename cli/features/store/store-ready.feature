@structured-task-store
Feature: Store ready command returns unblocked features

  Agents query the store for features that have no unmet dependencies
  and are not in a terminal or blocked status. The command returns
  only features whose prerequisite features (if any) are completed.

  Background:
    Given a store is initialized

  Scenario: Ready returns features with no dependencies
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And feature "login-flow" has status "pending"
    When an agent queries for ready features
    Then the result should include feature "login-flow"

  Scenario: Ready excludes features with incomplete dependencies
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And a feature "token-cache" exists under "auth-system" depending on "login-flow"
    And feature "login-flow" has status "pending"
    When an agent queries for ready features
    Then the result should not include feature "token-cache"

  Scenario: Ready includes features whose dependencies are all completed
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And a feature "token-cache" exists under "auth-system" depending on "login-flow"
    And feature "login-flow" has status "completed"
    And feature "token-cache" has status "pending"
    When an agent queries for ready features
    Then the result should include feature "token-cache"
    And the result should not include feature "login-flow"

  Scenario: Ready returns empty when all features are blocked or completed
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And feature "login-flow" has status "completed"
    When an agent queries for ready features
    Then the result should be empty

  Scenario: Ready spans multiple epics
    Given an epic "auth-system" exists in the store
    And an epic "data-pipeline" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies and status "pending"
    And a feature "ingestion" exists under "data-pipeline" with no dependencies and status "pending"
    When an agent queries for ready features
    Then the result should include feature "login-flow"
    And the result should include feature "ingestion"
