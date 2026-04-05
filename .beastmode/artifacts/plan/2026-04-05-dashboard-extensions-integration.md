# Integration Test Artifact — dashboard-extensions

Epic: `dashboard-extensions`
Date: 2026-04-05

---

## New Scenarios

### Feature: tree-refactor

Covers user stories [1, 2, 3, 4].

```gherkin
@dashboard-extensions
Feature: Log tree displays full pipeline skeleton with CLI root hierarchy

  The log tree renders all pipeline entities from the store as a
  three-level hierarchy: CLI root > Epic > Feature. System-level
  entries (watch loop events, scan events, errors) appear under
  the CLI root node. Blocked and upcoming entities appear dimmed
  with their status visible. Active entities show a spinner
  indicator. Phase is displayed as a label on each entry rather
  than as a tree level.

  Background:
    Given the dashboard is running
    And the store contains the following pipeline state:
      | epic      | feature     | status  | phase     |
      | auth      | login-flow  | active  | implement |
      | auth      | token-cache | blocked | plan      |
      | pipeline  | watcher     | upcoming| design    |

  Scenario: System-level entries appear under a CLI root node
    When the watch loop emits a system-level event
    Then the log tree shows a CLI root node
    And the system-level event appears as a child of the CLI root node

  Scenario: All epics from the store appear in the tree skeleton
    When the log tree is rendered
    Then the log tree shows epic "auth" under the CLI root
    And the log tree shows epic "pipeline" under the CLI root

  Scenario: Features appear as children of their parent epic
    When the log tree is rendered
    Then feature "login-flow" appears under epic "auth"
    And feature "token-cache" appears under epic "auth"
    And feature "watcher" appears under epic "pipeline"

  Scenario: Blocked and upcoming entities are dimmed with status visible
    When the log tree is rendered
    Then feature "token-cache" is displayed dimmed
    And feature "token-cache" shows status "blocked"
    And feature "watcher" is displayed dimmed
    And feature "watcher" shows status "upcoming"

  Scenario: Active entities show a spinner indicator
    When the log tree is rendered
    Then feature "login-flow" shows a spinner indicator
    And feature "token-cache" does not show a spinner indicator

  Scenario: Phase is displayed as a label, not as a tree level
    When the log tree is rendered
    Then feature "login-flow" shows phase label "implement"
    And the tree has no phase-level nodes between epic and feature

  Scenario: Tree hierarchy is exactly three levels deep
    When the log tree is rendered
    Then the tree depth from CLI root to feature is exactly three levels
    And no entries appear at a fourth level
```

### Feature: keyboard-extensions

Covers user stories [5, 7, 8, 11].

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

### Feature: focus-border

Covers user stories [8].

```gherkin
@dashboard-extensions
Feature: Focused panel border animates in sync with nyan banner

  The currently focused panel has its border color animated to
  match the leftmost color position of the nyan banner gradient.
  The unfocused panel uses the default border color.

  Scenario: Focused panel border uses the nyan banner leftmost color
    Given the dashboard is running
    And the Epics panel is focused
    When the nyan banner animation ticks
    Then the Epics panel border color matches the nyan banner leftmost color
    And the Log panel border uses the default border color

  Scenario: Border color updates on each animation tick
    Given the dashboard is running
    And a panel is focused
    When the nyan banner animation advances by multiple ticks
    Then the focused panel border color changes on each tick
    And the color progression follows the nyan banner gradient

  Scenario: Focus change transfers the animated border
    Given the dashboard is running
    And the Epics panel has the animated border
    When the user switches focus to the Log panel
    Then the Log panel border animates with the nyan banner color
    And the Epics panel border reverts to the default color
```

### Feature: epics-tree

Covers user stories [9].

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

### Feature: details-panel

Covers user stories [10].

```gherkin
@dashboard-extensions
Feature: Details panel shows context-sensitive content

  The panel formerly named "Overview" is renamed to "Details" and
  displays content that changes based on the current selection:
  overview info when "(all)" is selected, the PRD artifact when
  an epic is selected, and the plan artifact when a feature is
  selected. Content is scrollable via PgUp/PgDn.

  Scenario: Panel is titled "Details"
    Given the dashboard is rendered
    When the user observes the panel titles
    Then the panel formerly known as "Overview" is titled "DETAILS"

  Scenario: Details panel shows overview info when all is selected
    Given the dashboard is running
    When the selection is "(all)"
    Then the Details panel displays the pipeline overview information

  Scenario: Details panel shows PRD artifact when an epic is selected
    Given the dashboard is running
    And the store contains an epic "auth" with a PRD artifact
    When the user selects epic "auth"
    Then the Details panel displays the PRD artifact content for "auth"

  Scenario: Details panel shows plan artifact when a feature is selected
    Given the dashboard is running
    And the store contains a feature "login-flow" with a plan artifact
    When the user selects feature "login-flow"
    Then the Details panel displays the plan artifact content for "login-flow"

  Scenario: Details panel content is scrollable
    Given the dashboard is running
    And the Details panel contains content longer than the visible area
    When the user scrolls down in the Details panel
    Then the Details panel shows content further down
    When the user scrolls up in the Details panel
    Then the Details panel shows content further up
```

### Feature: dashboard-wiring

Feature `dashboard-wiring` covers user stories [1-12] as integration wiring through App.tsx, ThreePanelLayout.tsx, and LogPanel.tsx. This is a structural/integration feature. Its behavioral scenarios are already captured across the other features above (tree-refactor, keyboard-extensions, focus-border, epics-tree, details-panel). No additional Gherkin scenarios are needed here — the feature is purely wiring glue that connects the behavioral features.

---

## Modified Scenarios

### 1. `cli/features/dashboard-wiring-fix.feature` — Scenario: "Each panel has an inline title"

**What changed:** User story 10 renames the "Overview" panel to "Details". The existing scenario asserts `the overview panel has title "OVERVIEW"`, which is now incorrect.

**Why:** The PRD explicitly renames the panel from "Overview" to "Details" with context-sensitive content.

```gherkin
@dashboard-wiring-fix
Feature: Dashboard wiring — ThreePanelLayout replaces TwoColumnLayout

  Scenario: Each panel has an inline title
    Given the ThreePanelLayout source is loaded
    When I check panel titles
    Then the epics panel has title "EPICS"
    And the details panel has title "DETAILS"
    And the log panel has title "LOG"
```

### 2. `cli/features/dashboard-wiring-fix.feature` — Scenario: "Overview panel displays pipeline state"

**What changed:** User story 10 replaces the static overview panel with a context-sensitive details panel. The existing scenario asserts static content ("Phase Distribution", "Sessions", "Git") which no longer applies — the panel now shows overview info, PRD artifacts, or plan artifacts depending on selection.

**Why:** The panel behavior is fundamentally different. The static content assertions are superseded by the context-sensitive model.

```gherkin
@dashboard-wiring-fix
Feature: Dashboard wiring — ThreePanelLayout replaces TwoColumnLayout

  Scenario: Details panel displays context-sensitive content
    Given the ThreePanelLayout source is loaded
    When I check the details panel content
    Then the details panel renders content based on the current selection
```

### 3. `cli/features/dashboard-polish-chrome.feature` — Scenario: "Overview panel title renders within its own border"

**What changed:** The panel title changes from "OVERVIEW" to "DETAILS" per user story 10.

**Why:** Panel rename.

```gherkin
@dashboard-polish
Feature: Outer chrome border removed and panel titles render within PanelBox borders

  Scenario: Details panel title renders within its own border
    Given the dashboard is rendered
    When I observe the details panel
    Then the details panel has a self-contained border with title "DETAILS"
```

### 4. `cli/features/pluggable-sink-model.feature` — Scenario: "TreeSink routes entries to the tree state"

**What changed:** User story 4 changes the log tree hierarchy to CLI > Epic > Feature with phase as a label, not a tree level. The existing scenario asserts "the tree state contains an entry under epic X phase Y", implying phase is a structural tree level. The behavioral intent should reflect that entries are filed under epic and feature, with phase as metadata.

**Why:** The tree hierarchy no longer uses phase as a nesting level. Entries are organized by epic and feature; phase is a label attached to each entry.

```gherkin
@logging-cleanup
Feature: Pluggable sink model behind a single LogSink interface

  Scenario: TreeSink routes entries to the tree state under epic and feature
    Given a logger is created with a TreeSink
    And the logger has epic context "my-epic" and feature context "my-feature" and phase context "plan"
    When the logger emits an info message "tree entry"
    Then the tree state contains an entry under epic "my-epic" and feature "my-feature"
    And the entry has phase label "plan"
```

---

## Deleted Scenarios

### 1. `cli/features/dashboard-wiring-fix.feature` — Scenario: "All flashy-dashboard requirements work together"

**Why obsolete:** This end-to-end verification scenario asserts "the overview panel is a static display component", which is directly contradicted by user story 10 (the panel is now context-sensitive, not static). The scenario also references the old five-requirement model which no longer applies after the dashboard-extensions epic adds phase filtering, focus management, scrollable log, epics tree expansion, and the details panel. A new integration verification would be needed, but it belongs to the new epic's test suite, not the old one.

---
