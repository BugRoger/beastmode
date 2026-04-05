---
phase: plan
slug: dashboard-extensions
epic: dashboard-extensions
feature: keyboard-extensions
wave: 1
---

# Keyboard Extensions

**Design:** `.beastmode/artifacts/design/2026-04-05-dashboard-extensions.md`

## User Stories

5. As a user, I want to press 'p' to cycle a phase filter (all > design > plan > implement > validate > release), so that I can focus the log on a specific phase without cluttering the tree hierarchy.
7. As a user, I want the log panel to be scrollable — auto-following new entries by default, with manual scroll when I Tab into the log panel and use arrow keys, and 'G'/End to resume auto-follow, so that I can review history without losing real-time updates.
8. As a user, I want Tab to switch focus between the Epics panel and the Log panel, with the focused panel's border animating in sync with the nyan banner's leftmost color position, so that focus state is visually obvious and distinctive.
11. As a user, I want to press 'b' to toggle visibility of blocked items in the log tree, so that I can declutter the view when I only care about active work.

## What to Build

**Focus state management:** Add a `focusedPanel` state field to the keyboard hook with values `'epics' | 'log'`, defaulting to `'epics'`. Tab key handler toggles between the two values. When `focusedPanel` is `'epics'`, arrow keys continue to drive epic list navigation. When `focusedPanel` is `'log'`, arrow keys control log scroll offset.

**Phase filter state:** Add a `phaseFilter` state field cycling through `'all' | 'design' | 'plan' | 'implement' | 'validate' | 'release'`. The 'p' key handler advances to the next value, wrapping from `'release'` back to `'all'`. The current phase filter is exposed in the keyboard state for consumers to apply filtering.

**Blocked toggle state:** Add a `showBlocked` boolean state field, defaulting to `true`. The 'b' key handler toggles this value. Exposed in keyboard state for consumers to filter blocked items from the tree.

**Log scroll state:** Add `logScrollOffset` and `logAutoFollow` state fields. `logAutoFollow` defaults to `true`. When auto-following, new entries keep the view at the bottom. When the log panel is focused and the user presses up-arrow, auto-follow pauses and `logScrollOffset` decrements. Down-arrow increments the offset. 'G' or End key resumes auto-follow (resets offset to bottom). The scroll offset is clamped to valid range based on total tree lines.

**Details scroll state:** Add `detailsScrollOffset` state field for PgUp/PgDn scrolling of the details panel. PgUp/PgDn keys are global (work regardless of which panel is focused) and adjust the details panel's scroll offset. The scroll offset is clamped to valid range based on content height.

**Arrow key routing:** Modify the existing arrow key handler to check `focusedPanel`. When `'epics'`, route to the existing `nav.handleNavInput()`. When `'log'`, route to the log scroll state adjustments.

**Key hints update:** Update the `getKeyHints()` function and `MODE_HINTS` constant to include the new keys: Tab (focus), p (phase), b (blocked), and scroll indicators when the log panel is focused. The phase filter label should show the current phase filter value in the hint bar.

**Global vs focused keys:** Keys 'q', '/', 'x', 'a', 'v' remain global (work regardless of focus). Tab, 'p', 'b', PgUp/PgDn are also global. Arrow keys and G/End are routed based on `focusedPanel`.

## Integration Test Scenarios

```gherkin
@dashboard-extensions
Feature: Keyboard shortcuts for phase filtering, scrolling, focus, and blocked toggle

  The dashboard supports keyboard shortcuts for filtering logs
  by phase, scrolling the log panel, switching panel focus, and
  toggling visibility of blocked items.

  # --- Phase filter cycling ---

  Scenario: Default phase filter shows all phases
    Given the dashboard is running
    When no phase filter changes have been made
    Then the log displays entries from all phases

  Scenario Outline: Pressing p cycles through phase filters
    Given the dashboard is running
    And the current phase filter is "<current>"
    When the user presses the phase filter key
    Then the phase filter changes to "<next>"

    Examples:
      | current   | next      |
      | all       | design    |
      | design    | plan      |
      | plan      | implement |
      | implement | validate  |
      | validate  | release   |
      | release   | all       |

  Scenario: Phase filter restricts visible log entries
    Given the dashboard is running
    And the store has entries for phases "design", "plan", and "implement"
    When the user sets the phase filter to "plan"
    Then only entries from phase "plan" are visible in the log
    And entries from phases "design" and "implement" are hidden

  # --- Log panel scrolling ---

  Scenario: Log panel auto-follows new entries by default
    Given the dashboard is running
    And the log panel has existing entries
    When a new log entry arrives
    Then the log panel scrolls to show the newest entry

  Scenario: User can manually scroll through log history
    Given the dashboard is running
    And the log panel is focused
    When the user scrolls up using arrow keys
    Then the log panel shows older entries
    And auto-follow is paused

  Scenario: Auto-follow resumes when user presses the resume key
    Given the dashboard is running
    And the log panel is focused
    And auto-follow is paused due to manual scrolling
    When the user presses the resume auto-follow key
    Then the log panel scrolls to the newest entry
    And auto-follow is active again

  # --- Focus switching ---

  Scenario: Tab switches focus between Epics panel and Log panel
    Given the dashboard is running
    And the Epics panel is focused
    When the user presses the focus toggle key
    Then the Log panel becomes focused
    And the Epics panel loses focus

  Scenario: Tab cycles focus back to the Epics panel
    Given the dashboard is running
    And the Log panel is focused
    When the user presses the focus toggle key
    Then the Epics panel becomes focused

  Scenario: Focused panel border animates with the nyan banner color
    Given the dashboard is running
    And a panel is focused
    When the nyan banner color advances
    Then the focused panel border color matches the leftmost color of the nyan banner

  # --- Blocked items toggle ---

  Scenario: Blocked items are visible by default
    Given the dashboard is running
    And the store contains blocked features
    When the log tree is rendered
    Then blocked features are visible in the tree

  Scenario: Pressing b hides blocked items
    Given the dashboard is running
    And the store contains blocked features
    And blocked items are currently visible
    When the user presses the blocked toggle key
    Then blocked features are hidden from the tree

  Scenario: Pressing b again shows blocked items
    Given the dashboard is running
    And blocked features are currently hidden
    When the user presses the blocked toggle key
    Then blocked features are visible in the tree again
```

## Acceptance Criteria

- [ ] Tab key toggles `focusedPanel` between `'epics'` and `'log'`
- [ ] 'p' key cycles `phaseFilter` through all > design > plan > implement > validate > release > all
- [ ] 'b' key toggles `showBlocked` boolean
- [ ] Arrow keys route to epic navigation when epics focused, log scroll when log focused
- [ ] Log auto-follow is default; scroll-up pauses it; 'G'/End resumes it
- [ ] `logScrollOffset` clamps to valid range
- [ ] PgUp/PgDn adjust `detailsScrollOffset` (global, independent of focus)
- [ ] Key hints bar shows current phase filter label, focus-dependent scroll hints
- [ ] Existing keys (q, /, x, a, v) remain global and unaffected
- [ ] All existing keyboard tests updated and passing
