@structured-task-store
Feature: Store commands output structured JSON

  All store CLI commands emit JSON responses so that agents can
  parse structured data without guessing output format.

  Background:
    Given a store is initialized
    And an epic "auth-system" exists in the store

  Scenario: Store ready outputs valid JSON
    When an agent runs the store ready command
    Then the output should be valid JSON
    And the JSON should contain an array of ready entities

  Scenario: Store tree outputs valid JSON
    When a developer runs the store tree command as JSON
    Then the output should be valid JSON
    And the JSON should contain the entity hierarchy

  Scenario: Store blocked outputs valid JSON
    When an orchestrator runs the store blocked command
    Then the output should be valid JSON
    And the JSON should contain an array of blocked entities

  Scenario: Store create outputs valid JSON with the created entity
    When a developer creates an epic with slug "new-epic" via JSON output
    Then the output should be valid JSON
    And the JSON should contain the hash ID of the created entity

  Scenario: Store update outputs valid JSON with the updated entity
    When a developer updates epic "auth-system" status to "plan" via JSON output
    Then the output should be valid JSON
    And the JSON should reflect the updated status

  Scenario: Error responses are also valid JSON
    When an agent queries for a nonexistent entity via the store
    Then the output should be valid JSON error
    And the JSON should contain an error field with a descriptive message
