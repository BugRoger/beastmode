---
phase: plan
slug: dashboard-polish
epic: dashboard-polish
feature: monokai-palette
wave: 2
---

# Monokai Palette

**Design:** `.beastmode/artifacts/design/2026-04-04-dashboard-polish.md`

## User Stories

3. As a user, I want all dashboard colors derived from the Monokai Pro palette (borders #727072, titles #78DCE8, phase colors mapped to unique accents, status colors), so the TUI feels native to my terminal theme.

## What to Build

Centralize all dashboard color definitions into a single Monokai Pro palette module and update all consumers:

- **Shared color constants module:** Create a centralized module exporting the full Monokai Pro color map. This replaces the three duplicate PHASE_COLOR definitions currently in EpicsPanel, OverviewPanel, and tree-format.

- **Phase color map:**
  - design: `#AB9DF2` (purple)
  - plan: `#78DCE8` (cyan)
  - implement: `#FFD866` (yellow)
  - validate: `#A9DC76` (green)
  - release: `#FC9867` (orange)
  - done: `#A9DC76` dim
  - cancelled: `#FF6188` dim
  - blocked: `#FF6188`

- **Chrome colors:**
  - Borders: `#727072` (Monokai gray)
  - Panel titles: `#78DCE8` (Monokai cyan)
  - Watch status: green `#A9DC76` / red `#FF6188`
  - Clock and hints text: `#727072`

- **Consumer updates:** All files that currently define or reference phase colors, border colors, title colors, watch status colors, or hint text colors must import from the shared module instead.

Update any existing tests that assert on specific color values (phase colors, border colors, etc.).

## Acceptance Criteria

- [ ] Single shared module exports all Monokai Pro color constants
- [ ] No duplicate PHASE_COLOR definitions remain in consumer files
- [ ] All 8 phase/status colors match the PRD hex values
- [ ] Panel borders render with `#727072`
- [ ] Panel titles render with `#78DCE8`
- [ ] Watch status uses `#A9DC76` (running) and `#FF6188` (stopped)
- [ ] Clock and hints text use `#727072`
- [ ] Existing color-related tests updated to match new hex values
