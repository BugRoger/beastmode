# Integration Test Plan: readme-refresh

## New Scenarios

### Feature: readme-accuracy-fixes

Covers user stories [1, 2, 3].

```gherkin
@readme-refresh
Feature: README content accuracy

  Background:
    Given the project repository with a published README

  Scenario: Config example uses real HITL gate names
    Given the README contains a config.yaml example block
    When a user reads the configuration example
    Then the example shows an "hitl" section with phase-level prose fields
    And the example does not contain a "gates" subsection with named gate IDs

  Scenario: Domain description matches actual directory structure
    Given the README contains a domain or directory listing
    When a user compares the listed domains to the actual .beastmode/ structure
    Then the listing includes "research" as the directory name
    And the listing does not reference "Meta" as a domain directory

  Scenario: README is consistent with current codebase as a trusted reference
    Given the README describes the project configuration format
    And the README describes the project directory layout
    When an existing user consults the README for reference
    Then every documented config key corresponds to a real config key
    And every documented directory name corresponds to an actual directory
```

## Modified Scenarios

No existing scenarios require modification.

## Deleted Scenarios

No existing scenarios are obsolete.
