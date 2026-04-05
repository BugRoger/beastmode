---
phase: plan
slug: dashboard-extensions
epic: dashboard-extensions
feature: epics-tree
wave: 2
---

# Epics Tree

**Design:** `.beastmode/artifacts/design/2026-04-05-dashboard-extensions.md`

## User Stories

9. As a user, I want the epics panel to expand into a tree when I select an epic — showing its child features as indented rows that become selectable — with single-expand behavior (selecting a different epic collapses the previous one), so that I can drill into features without leaving the epics view.

## What to Build

**Expansion state:** Add an `expandedEpicSlug` state field to track which epic (if any) is currently expanded in the Epics panel. When an epic is selected (Enter or navigated to), it expands to reveal its child features as indented rows immediately below it. Only one epic can be expanded at a time — selecting a different epic collapses the previous one. Selecting the same epic again collapses it (toggle behavior).

**Feature rows:** When an epic is expanded, its features from the `EnrichedEpic.features` array render as indented rows below the epic row. Each feature row shows: indentation (2-4 spaces deeper than the epic), feature slug, and status badge. Features inherit the dimming and coloring rules from `monokai-palette.ts` based on their `FeatureStatus`.

**Selectable features:** Feature rows participate in the navigation model. The total `itemCount` for the keyboard hook increases when an epic is expanded (epic rows + feature rows + the "(all)" row). Arrow key navigation moves through both epic and feature rows seamlessly. The selection index maps to: index 0 = "(all)", then epic rows interleaved with their expanded feature rows.

**Row-to-selection mapping:** Build a flat list of selectable rows from the epics array: for each epic, emit the epic row; if that epic is expanded, emit its feature rows. The `slugAtIndex` callback must be updated to return either an epic slug or a `{ epicSlug, featureSlug }` tuple so the details panel can differentiate between epic and feature selection.

**Scroll viewport:** The existing viewport scrolling logic (measuring available height, keeping selected row in view) continues to work — the row count just increases when an epic is expanded.

**Single-expand enforcement:** When a new epic is expanded, the previously expanded epic collapses automatically. This is a simple state replacement, not a toggle set.

## Integration Test Scenarios

```gherkin
@dashboard-extensions
Feature: Epics panel expands into a tree showing child features

  Selecting an epic in the Epics panel expands it to show its
  child features as indented, selectable rows. Only one epic
  can be expanded at a time — selecting a different epic
  collapses the previous one.

  Background:
    Given the dashboard is running
    And the store contains epics:
      | epic      | features                |
      | auth      | login-flow, token-cache |
      | pipeline  | watcher, scheduler      |

  Scenario: Selecting an epic expands to show its features
    When the user selects epic "auth" in the Epics panel
    Then features "login-flow" and "token-cache" appear as indented rows under "auth"
    And the features are selectable

  Scenario: Selecting a different epic collapses the previous one
    Given epic "auth" is currently expanded
    When the user selects epic "pipeline"
    Then features "watcher" and "scheduler" appear under "pipeline"
    And features under "auth" are no longer visible

  Scenario: Selecting the same epic again collapses it
    Given epic "auth" is currently expanded
    When the user selects epic "auth" again
    Then features under "auth" are no longer visible

  Scenario: Features under an expanded epic are selectable
    Given epic "auth" is expanded
    When the user selects feature "login-flow"
    Then feature "login-flow" is marked as the active selection
```

## Acceptance Criteria

- [ ] Selecting an epic in the Epics panel expands it to show child features
- [ ] Feature rows are indented and show slug + status badge
- [ ] Features use `PHASE_COLOR` and `isDim()` for coloring
- [ ] Only one epic expanded at a time (single-expand behavior)
- [ ] Selecting the same epic again collapses it
- [ ] Feature rows are selectable via arrow key navigation
- [ ] `itemCount` and `slugAtIndex` correctly account for expanded feature rows
- [ ] Viewport scrolling keeps selected row (epic or feature) in view
- [ ] Selection state distinguishes between epic and feature selection
