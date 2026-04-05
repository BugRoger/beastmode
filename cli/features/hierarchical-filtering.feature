@logging-cleanup
Feature: Logs can be filtered by epic and feature hierarchically

  Filtering by epic includes all entries from that epic and all its
  features. Filtering by a specific feature narrows to entries from
  that feature only. When no filter is active, all entries are visible.

  Background:
    Given a logger is created
    And the logger emits entries for multiple epics and features:
      | epic      | feature | message          |
      | dashboard | layout  | layout entry     |
      | dashboard | panel   | panel entry      |
      | dashboard |         | epic-level entry |
      | auth      | login   | login entry      |
      | auth      | token   | token entry      |

  Scenario: No filter shows all entries
    When no epic or feature filter is applied
    Then all five entries are visible

  Scenario: Filtering by epic includes all its features
    When the filter is set to epic "dashboard"
    Then the visible entries are:
      | message          |
      | layout entry     |
      | panel entry      |
      | epic-level entry |
    And entries from epic "auth" are not visible

  Scenario: Filtering by epic and feature narrows to that feature
    When the filter is set to epic "dashboard" and feature "layout"
    Then the visible entries are:
      | message      |
      | layout entry |
    And the "panel entry" is not visible
    And the "epic-level entry" is not visible

  Scenario: Filtering by a non-existent epic returns no entries
    When the filter is set to epic "nonexistent"
    Then no entries are visible
