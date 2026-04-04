---
phase: plan
slug: dashboard-fullheight-redesign
epic: dashboard-fullheight-redesign
feature: two-column-layout
wave: 1
---

# Two-Column Layout

**Design:** .beastmode/artifacts/design/2026-04-04-dashboard-fullheight-redesign.md

## User Stories

1. As a user, I want the dashboard to fill the entire terminal vertically, so that I can see more information at once without wasted whitespace.
2. As a user, I want a left panel with the epic list and context-sensitive details stacked vertically, so that I can see epic state and drill-down information in one column.
3. As a user, I want a right panel showing the full hierarchical tree view (same as `beastmode watch`), so that I can monitor live pipeline activity alongside the epic list.
5. As a user, I want the "(all)" selection to show the full unfiltered tree, so that I can see the complete pipeline activity when not focused on a specific epic.
6. As a user, I want each panel to have its own border with inset title and dark charcoal background styling, so that the dashboard looks like a polished full-screen application.

## What to Build

Replace the existing `ThreePanelLayout` component with a new `TwoColumnLayout` component. The new layout uses a two-column structure where both columns fill the entire terminal height via `flexGrow={1}`.

**Left column (40% width):** Stacks the epics panel (60% of column height) above the details panel (40% of column height). Each is wrapped in its own `PanelBox` with inset title and dark charcoal background.

**Right column (60% width):** Full-height `PanelBox` containing the tree view (currently the log panel). Preserves existing `trimTreeToTail` auto-follow behavior.

**Outer chrome removal:** The current outer `borderStyle="single"` cyan-bordered Box wrapping all panels is removed. The header ("beastmode" + watch status + clock) becomes a plain `<Box>` row with `paddingX={1}` and no border, positioned above the columns.

**Footer:** Key hints bar below the columns, single dimmed line. Same context-sensitive behavior as today.

**Panel styling updates:** Each `PanelBox` retains `borderStyle="single"` with cyan border and inset title. Panel interior backgrounds use dark charcoal (#2d2d2d / ANSI 256 color 236) via Ink's `backgroundColor` prop.

**Root component wiring:** `App.tsx` switches from rendering `ThreePanelLayout` to rendering `TwoColumnLayout`, passing the same slot components (epicsSlot, detailsSlot, logSlot) in their new positions.

**MinSizeGate:** Preserved unchanged at 80x24 minimum.

**Tests:** Snapshot tests for the new layout component verifying flex proportions and slot rendering. Existing `three-panel-layout.test.ts` updated or replaced to cover the new component.

## Acceptance Criteria

- [ ] Dashboard fills entire terminal height — no whitespace gap between panels and terminal edges
- [ ] Left column is 40% width with epics (60% height) stacked above details (40% height)
- [ ] Right column is 60% width showing full-height tree view
- [ ] No outer chrome border wrapping the layout
- [ ] Header renders as borderless row with "beastmode" left, watch status + clock right
- [ ] Each panel has its own bordered PanelBox with inset title and cyan border
- [ ] Panel interiors use dark charcoal background (#2d2d2d / color 236)
- [ ] Footer key hints bar renders below the columns
- [ ] MinSizeGate still enforces 80x24 minimum
- [ ] Existing keyboard navigation continues to work unchanged
- [ ] Tree view preserves auto-follow tail behavior
- [ ] Layout renders correctly at both 80x24 and 200x50 terminal sizes
