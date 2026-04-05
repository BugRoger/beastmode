@github-issue-enrichment
Feature: Epic issue body contains compare URL for full diff

  The epic issue body includes a compare URL pointing to the diff
  between the main branch and the feature branch, allowing one-click
  access to the full set of code changes.

  Scenario: Active epic body contains compare URL
    Given an epic is in active development on a feature branch
    When the epic issue body is enriched
    Then the body contains a compare URL from the main branch to the feature branch

  Scenario: Compare URL appears in the git metadata section
    Given an epic is in active development
    When the epic issue body is enriched
    Then the compare URL appears in the git metadata section of the body
    And the compare URL is a clickable markdown link
