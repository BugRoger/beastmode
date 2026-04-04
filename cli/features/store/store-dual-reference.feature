@structured-task-store
Feature: Entities referenced by hash ID or human slug

  All phase commands accept either the hash ID (e.g., "bm-a3f8") or
  the human-readable slug (e.g., "cli-restructure") when referencing
  an epic. Both resolve to the same entity.

  Background:
    Given a store is initialized
    And an epic exists with slug "auth-system" and hash ID tracked

  Scenario: Referencing an epic by hash ID
    When a developer queries the epic using its hash ID
    Then the store should return the epic with slug "auth-system"

  Scenario: Referencing an epic by human slug
    When a developer queries the epic using slug "auth-system"
    Then the store should return the epic with the tracked hash ID

  Scenario: Phase command accepts hash ID
    When a developer runs a find command targeting the tracked hash ID
    Then the command should resolve to epic "auth-system"

  Scenario: Phase command accepts human slug
    When a developer runs a find command targeting "auth-system"
    Then the command should resolve to the epic with the tracked hash ID

  Scenario: Ambiguous reference returns an error
    Given an epic exists with slug that matches another epic's hash ID
    When a developer queries using the ambiguous reference
    Then both epics should be discoverable through unambiguous identifiers
