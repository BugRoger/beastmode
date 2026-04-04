@structured-task-store
Feature: Store tree displays full entity hierarchy

  Developers can browse the complete entity hierarchy using the
  store tree command. The output shows epics, their features,
  statuses, dependencies, and artifact references in a single view.

  Background:
    Given a store is initialized

  Scenario: Tree shows a single epic with its features
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And feature "login-flow" has status "pending"
    And a feature "token-cache" exists under "auth-system" with no dependencies
    And feature "token-cache" has status "completed"
    When a developer runs the store tree command
    Then the tree should contain epic "auth-system"
    And the tree should contain feature "login-flow" under "auth-system"
    And the tree should contain feature "token-cache" under "auth-system"

  Scenario: Tree shows multiple epics
    Given an epic "auth-system" exists in the store
    And an epic "data-pipeline" exists in the store
    When a developer runs the store tree command
    Then the tree should contain epic "auth-system"
    And the tree should contain epic "data-pipeline"

  Scenario: Tree shows dependency relationships
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And a feature "token-cache" exists under "auth-system" depending on "login-flow"
    When a developer runs the store tree command
    Then the tree should show feature "token-cache" depending on "login-flow"

  Scenario: Tree shows empty store
    When a developer runs the store tree command on an empty store
    Then the tree should be empty
