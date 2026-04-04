@github-issue-enrichment
Feature: Feature issue body displays description and user story

  A feature's GitHub issue body contains its description and associated
  user story, extracted from the plan artifact. Each feature issue also
  references its parent epic.

  Scenario: Feature issue body contains description and user story
    Given a feature has been defined in the plan phase
    And the plan artifact includes a description and user story for the feature
    When the feature issue body is enriched
    Then the body contains the feature description
    And the body contains the user story

  Scenario: Feature issue body references parent epic
    Given a feature belongs to an epic with a GitHub issue
    When the feature issue body is enriched
    Then the body contains a reference to the parent epic issue

  Scenario: Feature issue body omits implementation task list
    Given a feature has been defined in the plan phase
    When the feature issue body is enriched
    Then the body does not contain an implementation task list
