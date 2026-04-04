@structured-task-store
Feature: Typed artifact fields per entity type

  Entities carry typed artifact fields corresponding to pipeline
  phases: design, plan, implement, validate, and release. Each
  field holds an explicit artifact reference rather than a generic
  phase-keyed record.

  Background:
    Given a store is initialized
    And an epic "auth-system" exists in the store

  Scenario: Setting a design artifact on an epic
    When the design artifact for epic "auth-system" is set to a reference
    Then the epic should have a design artifact reference
    And the epic should not have plan, implement, validate, or release artifact references

  Scenario: Setting a plan artifact on an epic
    Given epic "auth-system" has a design artifact reference
    When the plan artifact for epic "auth-system" is set to a reference
    Then the epic should have both design and plan artifact references

  Scenario: Setting an implement artifact on a feature
    Given a feature "login-flow" exists under "auth-system"
    When the implement artifact for feature "login-flow" is set to a reference
    Then the feature should have an implement artifact reference
    And the feature should not have a release artifact reference

  Scenario Outline: Each phase has its own typed artifact field
    When the <phase> artifact for epic "auth-system" is set to a reference
    Then the epic should have a <phase> artifact reference

    Examples:
      | phase     |
      | design    |
      | plan      |
      | implement |
      | validate  |
      | release   |
