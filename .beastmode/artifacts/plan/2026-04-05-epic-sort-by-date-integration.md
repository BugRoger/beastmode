# Integration Test Artifact: epic-sort-by-date

Epic: **epic-sort-by-date**

## New Scenarios

### Feature: sort-epics-by-date

Covers user stories [1, 2, 3].

```gherkin
@epic-sort-by-date
Feature: Epics are sorted by status group and creation date

  Epics appear with active epics above completed/cancelled epics.
  Within each group, epics are sorted newest-first by creation date.
  This ordering is consistent across the dashboard and CLI status views.

  Background:
    Given an epic "old-epic" was created on "2025-01-15" with status "implement"
    And an epic "mid-epic" was created on "2025-06-10" with status "plan"
    And an epic "new-epic" was created on "2025-12-01" with status "design"
    And an epic "done-epic" was created on "2025-11-20" with status "done"
    And an epic "cancelled-epic" was created on "2025-12-15" with status "cancelled"

  Scenario: Active epics appear newest-first by creation date on the dashboard
    When the user views the dashboard epic list
    Then the epic list shows "new-epic" before "mid-epic"
    And the epic list shows "mid-epic" before "old-epic"

  Scenario: Done and cancelled epics appear below all active epics on the dashboard
    When the user views the dashboard epic list
    Then all active epics appear before "done-epic"
    And all active epics appear before "cancelled-epic"

  Scenario: Done and cancelled epics are sorted newest-first within their group
    When the user views the dashboard epic list
    Then "cancelled-epic" appears before "done-epic" in the completed group

  Scenario: CLI status command shows the same sort order as the dashboard
    When the user runs the CLI status command
    Then the epic list shows "new-epic" before "mid-epic"
    And the epic list shows "mid-epic" before "old-epic"
    And all active epics appear before "done-epic"
    And all active epics appear before "cancelled-epic"

  Scenario Outline: Epics in any active phase sort above terminal-state epics
    Given an epic "active-one" was created on "2025-03-01" with status "<active_phase>"
    And an epic "terminal-one" was created on "2025-09-01" with status "<terminal_phase>"
    When the user views the dashboard epic list
    Then "active-one" appears before "terminal-one"

    Examples:
      | active_phase | terminal_phase |
      | design       | done           |
      | plan         | done           |
      | implement    | done           |
      | validate     | done           |
      | release      | done           |
      | design       | cancelled      |
      | implement    | cancelled      |

  Scenario: A newly created epic appears at the top of the active group
    Given the existing epics from the background
    When a new epic "brand-new" is created with status "design"
    And the user views the dashboard epic list
    Then "brand-new" appears as the first epic in the list

  Scenario: An epic transitioning to done moves to the completed group
    Given the existing epics from the background
    When epic "new-epic" transitions to status "done"
    And the user views the dashboard epic list
    Then "new-epic" no longer appears in the active group
    And "new-epic" appears in the completed group
```

## Modified Scenarios

None. No existing scenarios cover epic sort order or status-based grouping.

## Deleted Scenarios

None. No existing scenarios are superseded by this epic.
