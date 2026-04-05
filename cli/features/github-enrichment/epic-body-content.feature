@github-issue-enrichment
Feature: Epic issue body displays PRD summary

  An epic's GitHub issue body contains the PRD summary extracted from the
  design artifact: problem statement, solution, user stories, and locked
  decisions. Observers understand the epic without leaving GitHub.

  Scenario: Epic issue body contains all PRD sections after design phase
    Given an epic has completed the design phase
    And the design artifact contains a problem statement, solution, user stories, and decisions
    When the epic issue body is enriched
    Then the body contains the problem statement section
    And the body contains the solution section
    And the body contains the user stories section
    And the body contains the decisions section

  Scenario: Epic issue body shows current phase badge
    Given an epic is at the plan phase
    When the epic issue body is enriched
    Then the body contains a phase badge indicating "plan"

  Scenario: Epic issue body includes feature checklist after plan phase
    Given an epic has completed the plan phase with three features
    When the epic issue body is enriched
    Then the body contains a checklist with three feature entries
    And each checklist entry shows the feature name

  Scenario: Epic issue body updates phase badge when phase advances
    Given an epic has been enriched at the design phase
    When the epic advances to the plan phase
    And the epic issue body is re-enriched
    Then the phase badge reflects "plan"

  Scenario: Epic issue body without a design artifact shows minimal content
    Given a new epic has no design artifact yet
    When the epic issue body is enriched
    Then the body contains the epic slug as the title
    And the body does not contain PRD sections
