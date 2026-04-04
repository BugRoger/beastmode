@structured-task-store
Feature: Hash-based entity identifiers for collision-free concurrency

  All entities in the store receive deterministic hash-based IDs
  derived from their content. Concurrent worktree agents creating
  entities at the same time never produce colliding identifiers.

  Background:
    Given a store is initialized

  Scenario: Creating an epic generates a hash-based ID
    When a developer creates an epic with slug "auth-system"
    Then the epic should have a hash-based ID matching "bm-" followed by a hex string
    And the epic should be retrievable by its hash ID

  Scenario: Creating a feature generates a unique hash-based ID
    Given an epic "auth-system" exists in the store
    When a developer creates a feature "login-flow" under "auth-system"
    Then the feature should have an ID distinct from the epic ID
    And the feature ID should encode the parent hierarchy

  Scenario: Two features with different names produce different IDs
    Given an epic "auth-system" exists in the store
    When a developer creates a feature "login-flow" under "auth-system"
    And a developer creates a feature "token-cache" under "auth-system"
    Then feature "login-flow" and feature "token-cache" should have different IDs

  Scenario: Updating a feature preserves its hash ID
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    When a developer updates feature "login-flow" with status "in-progress"
    Then the feature hash ID should remain unchanged

  Scenario: Creating an epic via CLI returns the hash ID
    When a developer creates an epic with slug "data-pipeline" via the store CLI
    Then the command output should contain the hash ID of the created epic
