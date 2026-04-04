---
phase: design
slug: flashy-dashboard
epic: flashy-dashboard
---

## Problem Statement

The beastmode dashboard is visually utilitarian — a plain cyan "beastmode" text header, panel titles floating on a separate line below frame borders, fixed phase-based colors with no animation, and no visual personality. The details panel dynamically updates on epic selection with spinners that add noise without insight. The dashboard doesn't reliably fill the full terminal height.

## Solution

Make the dashboard visually distinctive with the beastmode ASCII block-character banner (`█▀▄`) cycling nyan cat rainbow colors across its characters at 80ms per tick, inline panel titles in border frames, a richer static overview panel replacing the dynamic per-epic details view, and proper fullscreen auto-expansion.

## User Stories

1. As a user, I want the beastmode ASCII banner displayed in the dashboard header with nyan cat rainbow colors scrolling across the characters, so that the dashboard has visual personality and is immediately recognizable.

2. As a user, I want the rainbow colors to shift across the banner every 80ms (matching the spinner tick rate), so that the banner has a smooth, continuous nyan-cat-trail animation effect.

3. As a user, I want panel titles (EPICS, OVERVIEW, LOG) rendered inline with the border frame rather than on a separate line below it, so that the layout looks polished and doesn't waste vertical space.

4. As a user, I want the details panel to always show a static pipeline overview (phase distribution, active sessions/worktrees, git status) instead of updating dynamically per epic selection, so that I get a stable, informative summary at a glance.

5. As a user, I want the dashboard to auto-expand to fill the full terminal height, so that it uses all available screen real estate without manual sizing.

## Implementation Decisions

- **Banner source**: The 2-line ASCII art from the old `hooks/session-start.sh` — `█▄▄ █▀▀ ▄▀█ █▀▀ ▀█▀ █▀▄▀█ █▀█ █▀▄ █▀▀` / `█▄█ ██▄ █▀█ ▄▄█  █  █ ▀ █ █▄█ █▄▀ ██▄` (version suffix stripped)
- **Nyan cat rainbow**: 6 stripe colors applied per-character across the banner, cycling via hue offset shift each tick. Colors (top to bottom in original nyan cat): Red `#FF0000`, Orange `#FF9008`, Yellow `#F6FF00`, Green `#7CFF27`, Cyan `#5FFBFF`, Purple `#6400FF`
- **Color cycling mechanism**: Each non-space character gets a color from the 6-stripe palette based on `(charIndex + tickOffset) % 6`. `tickOffset` increments every 80ms. Both banner lines use the same offset so stripes are vertically coherent.
- **Truecolor rendering**: Use Ink's `Text` component with hex color props. Ink 6 + chalk 5 support truecolor when the terminal does. No fallback needed — the dashboard already requires a modern terminal.
- **Watch status + clock**: Right-aligned on banner line 1 (same row as the first line of ASCII art), maintaining existing green/red watch status and dimmed clock
- **Panel title rendering**: Use `@mishieck/ink-titled-box` community package for titles embedded in top border. Replaces custom `PanelBox` component.
- **Details panel → Overview panel**: Renamed from "DETAILS" to "OVERVIEW". Always shows static pipeline overview regardless of epic selection. Contents: phase distribution (epic count per phase), active sessions/worktrees count, git branch + dirty/clean state.
- **Active sessions data**: Sourced from existing `activeSessions` Set in App.tsx. Worktree count derived from active session count (1:1 mapping).
- **Git status**: Read git branch name and dirty state. Refresh on scan-complete events (same cadence as epic list refresh).
- **Full terminal height**: Pass terminal rows to the outer Ink `Box` as explicit `height` and use `useTerminalSize` hook for dynamic resize tracking. The `MinSizeGate` already handles undersized terminals.
- **Layout structure remains three-panel**: EPICS (left), OVERVIEW (right), LOG (bottom) — same spatial arrangement as current ThreePanelLayout, but with inlined titles and banner header.
- **Spinner and phase colors preserved**: Existing braille spinners and phase color mapping in EpicsPanel and LogPanel are unchanged — the nyan rainbow applies only to the banner.

## Testing Decisions

- Unit tests for the nyan color cycling function: verify offset wrapping, stripe assignment per character index, and space-skipping behavior
- Unit tests for the overview panel data: phase distribution counting, active session aggregation
- Visual smoke test: run `beastmode dashboard` and verify banner renders with cycling colors, titles are inline with borders, overview panel shows all three sections, and the layout fills the terminal
- Prior art: existing dashboard tests (if any) in `cli/src/dashboard/__tests__/`; the tree-format tests provide a pattern for testing pure formatting functions

## Out of Scope

- Changing the three-panel layout structure (epics/overview/log arrangement)
- Adding per-epic drill-down views
- Modifying the log panel or tree view
- Changing phase-based colors for spinners, epic badges, or tree lines
- Adding taglines or other session-start hook features
- Non-truecolor terminal fallback for the banner (dashboard already assumes modern terminal)

## Further Notes

- The banner ASCII art and nyan colors are a direct revival of the v0.11.2 session-start hook banner, adapted from a one-shot bash/python script to a live React component with continuous animation.
- `@mishieck/ink-titled-box` is a lightweight dependency that extends Ink's native Box — evaluate compatibility with Ink v6 during implementation.

## Deferred Ideas

None
