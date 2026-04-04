@structured-task-store
Feature: Store blocked command shows entities requiring intervention

  The store blocked command returns all entities with status "blocked"
  so that pipeline orchestrators can immediately see which entities
  require human or automated intervention.

  Background:
    Given a store is initialized

  Scenario: Blocked returns entities with blocked status
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with status "blocked"
    When an orchestrator queries for blocked entities
    Then the blocked result should include feature "login-flow"

  Scenario: Blocked excludes entities that are not blocked
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And feature "login-flow" has status "pending"
    And a feature "token-cache" exists under "auth-system" with no dependencies
    And feature "token-cache" has status "completed"
    When an orchestrator queries for blocked entities
    Then the blocked result should be empty

  Scenario: Blocked spans multiple epics
    Given an epic "auth-system" exists with feature "login-flow" status "blocked"
    And an epic "data-pipeline" exists with feature "ingestion" status "blocked"
    When an orchestrator queries for blocked entities
    Then the blocked result should include feature "login-flow"
    And the blocked result should include feature "ingestion"

  Scenario: Blocked includes epics that are themselves blocked
    Given an epic "user-dashboard" exists in the store
    And epic "user-dashboard" has status "blocked"
    When an orchestrator queries for blocked entities
    Then the blocked result should include epic "user-dashboard"

  Scenario: Blocked returns empty for a healthy pipeline
    Given an epic "auth-system" exists with feature "login-flow" status "completed"
    And an epic "data-pipeline" exists with feature "ingestion" status "in-progress"
    When an orchestrator queries for blocked entities
    Then the blocked result should be empty
