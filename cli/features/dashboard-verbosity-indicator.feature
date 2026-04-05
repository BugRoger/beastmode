@logging-cleanup
Feature: Key hints bar displays current log verbosity level

  The dashboard key hints bar must show the current log verbosity level
  so the operator knows what level of detail they are viewing. The
  indicator updates when the verbosity level changes.

  Scenario: Key hints bar shows default verbosity level
    Given the dashboard is running
    When no verbosity changes have been made
    Then the key hints bar displays the verbosity level as "info"

  Scenario: Key hints bar updates when verbosity changes
    Given the dashboard is running
    And the current log verbosity level is "info"
    When the operator presses the verbosity toggle key
    Then the key hints bar displays the verbosity level as "debug"

  Scenario: Key hints bar shows the verbosity toggle shortcut
    Given the dashboard is running
    Then the key hints bar includes a hint for the verbosity toggle key
    And the hint shows the current verbosity level
