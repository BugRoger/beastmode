@structured-task-store
Feature: Pluggable store backend interface

  The store exposes a backend interface that the JSON file
  implementation satisfies. The interface contract allows swapping
  to git-synced JSON, SQLite, or Dolt without changing CLI or
  agent commands.

  Background:
    Given the store backend interface is defined

  Scenario: JSON file backend satisfies the store interface
    Given the store is configured with the in-memory backend
    When a developer creates an epic via the store
    And the developer queries for the created epic
    Then the epic should be persisted and retrievable

  Scenario: Store operations work identically regardless of backend
    Given the store is configured with the in-memory backend
    When a developer creates an epic, adds a feature, and queries ready features
    Then the results should be consistent with the store interface contract

  Scenario: Backend can be swapped without changing commands
    Given the store is configured with the in-memory backend
    When the same store operations are executed
    Then the operation signatures and output format should be identical
