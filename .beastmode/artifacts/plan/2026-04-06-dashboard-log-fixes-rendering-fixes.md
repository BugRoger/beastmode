---
phase: plan
slug: "179441"
epic: dashboard-log-fixes
feature: rendering-fixes
wave: 1
---

# Rendering Fixes

**Design:** `.beastmode/artifacts/design/2026-04-06-179441.md`

## User Stories

5. As a user watching the dashboard, I want system-level entries (watch loop events, scan results) to render as a "SYSTEM" tree node with full hierarchical formatting so that the tree is visually consistent — no exceptions.
6. As a user watching the dashboard, I want active sessions that haven't synced to the store yet to show their current phase as the status badge instead of "(unknown)" so that the tree is always informative.

## What to Build

Two independent rendering fixes across the tree builder, log panel functions, and tree view component:

**1. Rename CLI root node to SYSTEM with consistent hierarchical rendering.** The current CLI root node renders differently from epic nodes — it uses a flat prefix pattern instead of the hierarchical tree connector pattern used by epics and features. Rename the node label from "CLI" to "SYSTEM" and apply the same tree rendering pattern as epic nodes: the SYSTEM node gets the standard epic-level tree connector prefix, and its child entries get the standard leaf prefix. Update the tree line counting function (`countTreeLines`) to count the SYSTEM node the same way it counts epic nodes (1 label line + N entry lines). Update the trim-to-tail and trim-from-head functions to handle the SYSTEM node consistently — it should participate in trimming the same way epics do, not be exempted or treated specially. Update the TreeView component to render the SYSTEM node with the Monokai muted gray color and the same indentation/connector pattern as epic nodes.

**2. Use session phase for dynamic node status badges.** When `buildTreeState` encounters a session that references an epic slug not present in the enriched epics skeleton, it creates a dynamic epic node on the fly. Currently these dynamic nodes get `"unknown"` as their status, which renders as an uninformative "(unknown)" badge. Instead, use the session's `phase` field as the status for dynamically created epic nodes — the phase (design, plan, implement, validate, release) is always available from the session and provides useful context. For dynamically created feature nodes, use `"in-progress"` as the status since the existence of a session implies active work.

## Integration Test Scenarios

```gherkin
@dashboard-log-fixes
Feature: System-level entries as SYSTEM node

  Scenario: Watch loop event renders as SYSTEM tree node
    Given the dashboard is running
    When a watch loop event is emitted
    Then the event renders under a "SYSTEM" tree node
    And the SYSTEM node uses hierarchical tree formatting
    And the SYSTEM node is consistent with other tree nodes

  Scenario: Scan result renders as SYSTEM tree node
    Given the dashboard is running
    When a scan result is emitted
    Then the result renders under a "SYSTEM" tree node
    And the SYSTEM node uses hierarchical tree formatting
    And the result is indented as a child of SYSTEM

  Scenario: Multiple system-level entries nest under single SYSTEM node
    Given the dashboard is running
    And a SYSTEM node is present
    When multiple watch loop events and scan results are emitted
    Then all events render as children of the same SYSTEM node
    And the SYSTEM node does not duplicate
    And entries maintain chronological order within the node

  Scenario: SYSTEM node uses consistent tree rendering as other entries
    Given the dashboard is running
    When system-level entries and regular log entries are emitted
    Then both render with the same hierarchical formatting
    And both use the same indentation levels
    And both apply the same styling and colors
    And visual consistency is maintained across the entire tree

  Scenario: SYSTEM node remains stable as entries are added
    Given the dashboard is running
    And the SYSTEM node contains multiple entries
    When new system-level entries are added
    Then the SYSTEM node expands to include them
    And the node structure does not collapse or reset
    And previously visible entries remain visible

@dashboard-log-fixes
Feature: Active sessions show current phase

  Scenario: Active session displays current phase as status badge
    Given the dashboard is running
    And an active session has not yet synced to the store
    When I observe the session's status badge
    Then the badge displays the current phase
    And the badge does not display "(unknown)"

  Scenario: Multiple active sessions each show their own phase
    Given the dashboard is running
    And multiple active sessions have not synced to the store
    When I observe the sessions in the tree
    Then each session displays its own current phase badge
    And one session does not borrow another's phase
    And all badges are up-to-date and distinct

  Scenario: Status badge persists until session syncs to store
    Given the dashboard is running
    And an active session shows its current phase badge
    When the session continues running in its current phase
    Then the badge persists and remains visible
    And the badge accurately reflects the phase
    When the session syncs to the store
    Then the badge transitions to the canonical phase from the store

  Scenario: Synced session phase matches original badge
    Given the dashboard is running
    And an active session showed its phase in the badge before syncing
    When the session syncs to the store
    Then the synced session shows the same phase as its canonical status
    And the displayed phase before and after sync are consistent

  Scenario: Dynamic feature nodes show in-progress status
    Given the dashboard is running
    And a session references a feature not in the store
    When a dynamic feature node is created
    Then the feature node shows "in-progress" as its status badge
    And the badge does not display "(unknown)"
```

## Acceptance Criteria

- [ ] System-level entries (watch loop start/stop, scan results, errors) render under a "SYSTEM" tree node
- [ ] The SYSTEM node uses the same tree connector prefix pattern as epic nodes
- [ ] The SYSTEM node's child entries use the same leaf prefix pattern as epic entries
- [ ] `countTreeLines` counts the SYSTEM node identically to how it counts epic nodes
- [ ] `trimTreeToTail` and `trimTreeFromHead` handle the SYSTEM node like an epic node
- [ ] TreeView renders the SYSTEM node in Monokai muted gray
- [ ] Dynamic epic nodes created for unknown sessions show the session's phase as status
- [ ] Dynamic feature nodes created for unknown sessions show "in-progress" as status
- [ ] No "(unknown)" badges appear in the tree for active sessions
