@structured-task-store
Feature: Dependency-based feature ordering

  Features declare explicit dependencies on other features rather
  than being assigned static wave numbers. The orchestrator derives
  execution order from the dependency graph. Partial failures and
  re-planning do not require manual wave reassignment.

  Background:
    Given a store is initialized

  Scenario: Features with no dependencies are immediately available
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists under "auth-system" with no dependencies and status "pending"
    And a feature "login-flow" exists under "auth-system" with no dependencies and status "pending"
    When the orchestrator computes execution order
    Then "auth-provider" and "login-flow" should both be available for dispatch

  Scenario: Dependent feature waits for its prerequisite
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists under "auth-system" with no dependencies and status "pending"
    And a feature "token-cache" exists under "auth-system" depending on "auth-provider"
    When the orchestrator computes execution order
    Then "auth-provider" should be available for dispatch
    And "token-cache" should not be available for dispatch

  Scenario: Completing a prerequisite unblocks its dependents
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists under "auth-system" with no dependencies
    And a feature "token-cache" exists under "auth-system" depending on "auth-provider"
    And feature "auth-provider" has status "completed"
    And feature "token-cache" has status "pending"
    When the orchestrator computes execution order
    Then "token-cache" should be available for dispatch

  Scenario: Diamond dependency graph resolves correctly
    Given an epic "auth-system" exists in the store
    And a feature "base-config" exists under "auth-system" with no dependencies and status "pending"
    And a feature "oauth-server" exists under "auth-system" depending on "base-config"
    And a feature "client-lib" exists under "auth-system" depending on "base-config"
    And a feature "integration" exists under "auth-system" depending on "oauth-server"
    And feature "integration" also depends on "client-lib"
    When feature "base-config" is completed
    Then "oauth-server" and "client-lib" should both be available for dispatch
    And "integration" should not be available for dispatch
    When "oauth-server" and "client-lib" are completed
    Then "integration" should be available for dispatch

  Scenario: Re-planning preserves dependency ordering without manual wave reassignment
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists under "auth-system" with no dependencies
    And a feature "token-cache" exists under "auth-system" depending on "auth-provider"
    And feature "auth-provider" has status "completed"
    And feature "token-cache" has status "blocked"
    When feature "token-cache" is reset to "pending"
    Then "token-cache" should be available for dispatch

  Scenario: Partial failure does not block independent features
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists under "auth-system" with no dependencies
    And a feature "login-flow" exists under "auth-system" with no dependencies and status "pending"
    And a feature "token-cache" exists under "auth-system" depending on "auth-provider"
    And feature "auth-provider" has status "blocked"
    When the orchestrator computes execution order
    Then "login-flow" should be available for dispatch
    And "token-cache" should not be available for dispatch
