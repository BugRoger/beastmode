@structured-task-store
Feature: Cross-epic dependency modeling for pipeline orchestration

  Epics can declare dependencies on features from other epics using
  the depends_on field. The watch loop uses these dependencies to
  detect when one epic is blocked by another epic's incomplete work.

  Background:
    Given a store is initialized

  Scenario: Epic B is blocked when it depends on an incomplete feature in epic A
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists under "auth-system" with status "pending"
    And an epic "user-dashboard" exists in the store
    And epic "user-dashboard" depends on feature "auth-provider"
    When the orchestrator evaluates epic readiness
    Then epic "user-dashboard" should not be ready

  Scenario: Epic B becomes unblocked when its cross-epic dependency completes
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists under "auth-system" with status "completed"
    And an epic "user-dashboard" exists in the store
    And epic "user-dashboard" depends on feature "auth-provider"
    When the orchestrator evaluates epic readiness
    Then epic "user-dashboard" should be ready

  Scenario: Multiple cross-epic dependencies must all be satisfied
    Given an epic "auth-system" exists with feature "auth-provider" status "completed"
    And an epic "data-pipeline" exists with feature "ingestion" status "pending"
    And an epic "reporting" exists in the store
    And epic "reporting" depends on feature "auth-provider"
    And epic "reporting" depends on feature "ingestion"
    When the orchestrator evaluates epic readiness
    Then epic "reporting" should not be ready

  Scenario: Circular dependencies are detected and reported
    Given an epic "epic-a" exists in the store
    And a feature "feature-a" exists under "epic-a" with no dependencies
    And an epic "epic-b" exists in the store
    And a feature "feature-b" exists under "epic-b" with no dependencies
    And feature "feature-a" also depends on "feature-b"
    And feature "feature-b" also depends on "feature-a"
    When the store checks for circular dependencies
    Then circular dependencies should be detected
