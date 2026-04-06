---
phase: plan
slug: "179441"
epic: dashboard-log-fixes
feature: system-node-rename
wave: 1
---

# System Node Rename

**Design:** .beastmode/artifacts/design/2026-04-06-179441.md

## User Stories

5. As a user watching the dashboard, I want system-level entries (watch loop events, scan results) to render as a "SYSTEM" tree node with full hierarchical formatting so that the tree is visually consistent — no exceptions.

## What to Build

The tree view currently renders system-level entries under a "CLI" root node with flat formatting — no tree prefix characters, no hierarchical indentation. This breaks visual consistency with epic nodes, which use `│` prefixes and `│ ·` leaf prefixes.

Rename the "CLI" label to "SYSTEM" throughout the tree rendering pipeline. Apply the same hierarchical formatting as epic nodes: the SYSTEM node gets a `│` prefix line, its child entries get `│ ·` leaf prefix lines. Use the Monokai muted gray color for the SYSTEM node (matching the existing chrome palette).

Update the tree line counting and trimming functions (`countTreeLines`, `trimTreeToTail`, `trimTreeFromHead`) to handle the SYSTEM node consistently with epic nodes — currently the CLI node gets special-cased as a single flat line, but after this change it should be counted the same way as an epic node (1 label line + N entry lines with leaf prefixes).

Update the tree view component to render the SYSTEM node using the same component structure as epic nodes rather than the current flat rendering path.

Update the tree prefix builder to emit the correct prefixes for the "system" node type — matching epic-level hierarchy rather than the current empty prefix.

## Integration Test Scenarios

```gherkin
@dashboard-log-fixes
Feature: System-level entries render as a SYSTEM tree node

  Watch loop events and scan results render under a dedicated "SYSTEM"
  node in the tree panel, using the same hierarchical formatting as
  epic and session nodes. No system-level entry renders as a flat
  unformatted line.

  Scenario: Watch loop event renders under the SYSTEM tree node
    Given the dashboard is running
    When the watch loop emits a scan-complete event
    Then the tree panel contains a "SYSTEM" top-level node
    And the scan-complete entry appears as a child of the SYSTEM node

  Scenario: Multiple system events group under the same SYSTEM node
    Given the dashboard is running
    When the watch loop emits the following events:
      | event type     |
      | scan-complete  |
      | scan-started   |
      | loop-tick      |
    Then all three entries appear as children of the single SYSTEM node

  Scenario: SYSTEM node uses the same hierarchical formatting as epic nodes
    Given the dashboard is running
    And the tree panel contains an epic node
    When a system-level event arrives
    Then the SYSTEM node has the same indentation style as the epic node
    And the SYSTEM node has a visible label and status indicator

  Scenario: No system-level entry renders outside the SYSTEM node
    Given the dashboard is running
    When multiple system-level and epic-level events have arrived
    Then every system-level entry is nested under the SYSTEM node
    And no system-level entry appears as a root-level flat line
```

## Acceptance Criteria

- [ ] Tree view renders "SYSTEM" label instead of "CLI" for the system node
- [ ] SYSTEM node uses `│` prefix (same as epic nodes)
- [ ] SYSTEM node entries use `│ ·` leaf prefix (same as epic entries)
- [ ] SYSTEM node renders in Monokai muted gray color
- [ ] `countTreeLines` counts SYSTEM node as 1 label + N entries (not flat)
- [ ] `trimTreeToTail` and `trimTreeFromHead` handle SYSTEM node consistently with epic nodes
- [ ] No system-level entry renders as a flat unformatted line
