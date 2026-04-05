---
phase: plan
slug: "535844"
epic: epic-sort-by-date
feature: sort-epics-by-date
wave: 1
---

# Sort Epics by Date

**Design:** `.beastmode/artifacts/design/2026-04-05-535844.md`

## User Stories

1. As a user viewing the dashboard, I want epics sorted newest-first by creation date, so that my most recent work is always at the top.
2. As a user viewing the dashboard, I want active epics grouped above done/cancelled epics, so that completed work doesn't clutter the top of the list.
3. As a user of the CLI status command, I want the same sort order as the dashboard, so that epic ordering is consistent across all views.

## What to Build

Add a two-tier sort comparator to the shared data layer module that enriches epics for consumption by both the dashboard and CLI. The comparator:

1. **Groups by activity state:** Active epics (design, plan, implement, validate, release) sort above terminal epics (done, cancelled). This is a boolean partition, not a per-status ranking.
2. **Sorts within each group by `created_at` descending:** Newest epics appear first within their group. The `created_at` field is an ISO 8601 string already present on the Epic entity.

The sort is applied in `listEnrichedFromStore()` — the single shared function consumed by both the dashboard and CLI status command. This ensures both views inherit the same ordering without duplicating logic.

The existing test suite has a `STATUS_ORDER` constant and `sortEpics()` helper that sort by phase progress. These must be updated to match the new sort contract (active/inactive grouping + `created_at` descending) so test expectations align with production behavior.

The "(all)" aggregate entry in `buildFlatRows()` is pinned at index 0 and is not a data entity — it is unaffected by this change.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] `listEnrichedFromStore()` returns epics sorted with active statuses before done/cancelled
- [ ] Within each group, epics are sorted by `created_at` descending (newest first)
- [ ] Dashboard displays epics in the sorted order without additional sorting logic
- [ ] CLI status command displays epics in the same sorted order
- [ ] "(all)" entry remains pinned at index 0 in the dashboard
- [ ] Existing tests updated to match new sort contract
- [ ] Unit tests cover: mixed active/inactive epics, same-group date ordering, edge case of equal timestamps
