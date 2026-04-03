---
phase: design
slug: dashboard-rework
epic: dashboard-rework
---

## Problem Statement

The current dashboard uses a drill-down model that forces navigating between views to see epic status, feature details, and session logs. Status and watch are separate commands with no unified view. Users must mentally stitch together information spread across multiple screens and commands.

## Solution

Full rewrite of the dashboard as a k9s-style three-panel split screen — epics list, details, and log visible simultaneously on one fullscreen view. Selecting an epic filters the details and log panels in place. No drill-down navigation. The old dashboard components (view stack, push/pop navigation, breadcrumb bar, activity log) are deleted and replaced with the new layout.

## User Stories

1. As a user, I want to see all my epics, their details, and live logs on a single screen, so that I don't have to navigate between views to understand pipeline state.
2. As a user, I want selecting an epic in the list to immediately update the details and log panels, so that I get context without extra keystrokes.
3. As a user, I want an "(all)" option in the epic list that shows an aggregate log stream and pipeline overview stats, so that I can monitor the entire pipeline at a glance.
4. As a user, I want the log panel to take most of the screen (~65%), so that I can follow session activity in detail.
5. As a user, I want to filter epics by name using `/`, so that I can quickly find what I'm looking for in a busy pipeline.
6. As a user, I want to cancel an epic with `x` and an inline confirmation, so that I can stop work without leaving the dashboard.
7. As a user, I want the dashboard to show a clean placeholder when no sessions are active, so that the UI doesn't look broken when the pipeline is idle.
8. As a user, I want the dashboard to enforce a minimum terminal size (80x24) with a friendly message, so that the layout doesn't render as garbage in a tiny terminal.
9. As a user, I want `beastmode status` and `beastmode status --watch` to continue working independently, so that I have lightweight options when I don't need fullscreen.
10. As a user, I want the dashboard to look visually pleasing with k9s-style cyan borders, phase-colored status indicators, and clean typography, so that monitoring the pipeline is not an eyesore.

## Implementation Decisions

- **Layout**: Three panels — epics (top-left), details (top-right), log (bottom full-width horizontal split)
- **Proportions**: ~35% top section, ~65% log section, fixed. Top section splits ~30/70 horizontal (epics narrow, details wide)
- **Max capacity**: 10 concurrent epics, 10 features per epic
- **Interaction model**: Epics panel is the sole interactive panel. Details and log are passive displays that react to epic selection. No tab focus, no panel switching
- **Log modes**: "(all)" entry at top of epic list shows interleaved aggregate stream from all sessions. Selecting a specific epic filters to that epic's sessions only. Log always auto-follows
- **Log format**: Timestamp (dim) + feature name (bold white) + content (regular white). Red for errors only. No per-feature color coding
- **Visual style**: Clean k9s — single-line box-drawing borders (`┌─┐│└┘┬├┤┴`), panel titles inset in top border (`─── EPICS ───`)
- **Color scheme (cyan chrome)**: Cyan borders and panel titles. Bold cyan for titles. White for content text. Phase colors on status tags (magenta=design, blue=plan, yellow=implement, cyan=validate, green=release/done, dim red=cancelled). Inverse (white-on-cyan) for selected epic row. Green for "watch: running", red for "watch: stopped". Dim for timestamps, done/cancelled rows, pending progress bars. Red for blocked status and errors
- **No dedicated header row**: Watch status and clock rendered in top-right corner of outer border
- **Keyboard shortcuts**: `q`/`Ctrl+C` (quit), `↑`/`↓` (navigate epics), `a` (toggle done/cancelled), `x` (cancel epic), `/` (filter)
- **Filter**: k9s style — inline prompt replaces key hints bar at bottom. Type to filter, Enter to apply, Escape to clear. Not incremental
- **Cancel confirmation**: Inline in key hints bar — "Cancel {slug}? y confirm n/esc abort"
- **Details panel for "(all)"**: Pipeline overview with total counts and phase breakdown table
- **Details panel for single-session phases** (design, plan, validate, release): Epic name + phase + session status with spinner and elapsed time
- **Details panel overflow**: Scrollable within panel when feature list exceeds available height (up to 10 features)
- **Empty log state**: Dim centered placeholder text "no active sessions"
- **Minimum terminal size**: 80x24 enforced, "terminal too small" message below that
- **Embedded watch loop**: Dashboard IS the orchestrator, same as current. SDK dispatch forced at runtime. Lockfile mutual exclusion with headless `beastmode watch`
- **Ring buffers**: Per-session (~100 entries), merge on render for aggregate views. No pre-merged buffers
- **Framework**: Ink v6.8.0 + React — no new dependencies. `<Box borderStyle borderColor>` for borders, `<Text color bold dim>` for typography, Yoga flexbox for layout
- **Old dashboard deletion**: EpicTable.tsx, FeatureList.tsx, AgentLog.tsx, ActivityLog.tsx, CrumbBar.tsx, and all keyboard hooks (use-keyboard-controller, use-keyboard-nav, use-cancel-flow, use-toggle-all) are deleted
- **Preserved backend**: WatchLoop integration, status-data.ts shared module, SDK message mapper, ring buffers per session, graceful shutdown hook
- **Shared code**: status-data.ts continues to serve `beastmode status`, `beastmode status --watch`, and the new dashboard — no duplication

## Testing Decisions

- Component unit tests for each new panel (EpicsPanel, DetailsPanel, LogPanel) using Ink's testing utilities
- Keyboard navigation tests (up/down selection, filter flow, cancel flow) — similar pattern to existing `keyboard-nav.test.ts`
- Ring buffer merge-on-render correctness tests — verify timestamp ordering across sessions
- Empty state rendering tests (no epics, no sessions, terminal too small)
- Integration test for epic selection updating details + log panels
- Existing watch loop and status-data tests remain as-is

## Out of Scope

- Theming/skinning system (k9s has YAML skins — we don't need that)
- Resizable panels (fixed proportions)
- Panel focus switching (only epics panel is interactive)
- Mouse support
- Per-feature color coding in logs
- Replacing `beastmode status` or `beastmode status --watch`
- Replacing headless `beastmode watch`

## Further Notes

- Research artifact saved at `.beastmode/artifacts/research/2026-04-03-k9s-tui-layout.md`
- The existing L2 context at `context/design/dashboard.md` will need updating after this ships — the view stack model, five-zone chrome, and push/pop navigation are all replaced

## Deferred Ideas

None
