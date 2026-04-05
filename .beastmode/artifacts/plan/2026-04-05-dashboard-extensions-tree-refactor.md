---
phase: plan
slug: dashboard-extensions
epic: dashboard-extensions
feature: tree-refactor
wave: 1
---

# Tree Refactor

**Design:** `.beastmode/artifacts/design/2026-04-05-dashboard-extensions.md`

## User Stories

1. As a user, I want the log tree to show a CLI root node containing system-level entries (watch loop start/stop, scan events, errors), so that system messages have proper hierarchy instead of rendering flat.
2. As a user, I want the log tree to show all epics and features from the store as a skeleton, including blocked and upcoming ones (dimmed with status visible), so that I can see the full pipeline state at a glance.
3. As a user, I want active epics and features in the log tree to show a spinner indicator, so that I can immediately identify what's currently running.
4. As a user, I want the log tree hierarchy to be CLI > Epic > Feature (no phase level), with phase displayed as a label on each entry, so that the tree is shallower and easier to scan.

## What to Build

**Type hierarchy refactor:** Replace the current three-level tree types (`EpicNode > PhaseNode > FeatureNode`) with a flattened two-level structure under a synthetic CLI root. Remove `PhaseNode` entirely. The new structure is:

- `CliNode` — synthetic root holding system-level entries (watch loop start/stop, scan events, errors)
- `EpicNode` — epic slug, status field, child features, direct entries (no phases array)
- `FeatureNode` — feature slug, status field, entries
- `TreeEntry` — gains a `phase: string` field for the phase label badge
- `TreeState` — changes from `{ epics, system }` to `{ cli: CliNode, epics: EpicNode[] }`

**Store-seeded skeleton builder:** Refactor `buildTreeState()` to accept enriched epic data from the store (`EnrichedEpic[]`) and produce a complete skeleton — nodes for all epics and their features regardless of whether they have log entries. Blocked and upcoming nodes carry their status. Active nodes are identifiable by status. Log entries from sessions and fallback stores attach to existing skeleton nodes by epic/feature slug matching. Phase is written to each `TreeEntry.phase` field during attachment.

**Tree view renderer:** Update `TreeView.tsx` to render the new hierarchy: CLI root node first (with system entries as children), then epic nodes with their feature children. Remove `PhaseNodeView`. Add phase label rendering as a colored badge on each entry line using the existing `PHASE_COLOR` map. Blocked/upcoming nodes render dimmed with their status badge visible. Active nodes show a spinner indicator using the existing `InlineSpinner` pattern from `EpicsPanel`.

**Tree format updates:** Update `tree-format.ts` depth constants to reflect the new CLI > Epic > Feature > Entry depths (removing the phase depth level). Add phase badge formatting support.

**Filter/trim updates:** Update `countTreeLines()`, `trimTreeToTail()`, and `filterTreeByVerbosity()` in `LogPanel.tsx` pure functions to work with the new type structure (no phases array iteration). Remove the 50-line default trim limit — keep all entries in memory for the session lifetime.

**Cross-cutting constraint:** Phase is a label on entries, not a tree level. The `PHASE_COLOR` map from `monokai-palette.ts` is used for badge coloring. The `isDim()` function determines dimming for blocked/done/cancelled status.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] `PhaseNode` type removed from `tree-types.ts`
- [ ] New `CliNode` type with system entries
- [ ] `TreeEntry` has a `phase: string` field
- [ ] `TreeState` uses `{ cli: CliNode, epics: EpicNode[] }` structure
- [ ] `buildTreeState()` accepts `EnrichedEpic[]` and produces store-seeded skeleton
- [ ] Log entries attach to existing skeleton nodes by slug matching
- [ ] `TreeView` renders CLI > Epic > Feature hierarchy with no phase tree level
- [ ] Phase labels render as colored badges using `PHASE_COLOR`
- [ ] Blocked/upcoming nodes render dimmed with status badge
- [ ] Active nodes show spinner indicator
- [ ] `countTreeLines()` and `trimTreeToTail()` work with new types
- [ ] Default trim limit removed (full scrollback)
- [ ] All existing tree-related tests updated and passing
