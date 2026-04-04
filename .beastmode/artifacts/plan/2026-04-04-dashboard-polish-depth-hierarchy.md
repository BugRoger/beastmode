---
phase: plan
slug: dashboard-polish
epic: dashboard-polish
feature: depth-hierarchy
wave: 3
---

# Depth Hierarchy

**Design:** `.beastmode/artifacts/design/2026-04-04-dashboard-polish.md`

## User Stories

5. As a user, I want background colors on the header bar (#403E41), hints bar (#403E41), and panel interiors (#353236) creating a three-tier depth hierarchy against the terminal background (#2D2A2E), so UI regions are visually distinct without harsh borders.

## What to Build

Add subtle background colors to create a three-tier visual depth system:

- **Tier 1 — Chrome (lightest):** Header bar (banner row + watch status) and hints bar both receive `backgroundColor: "#403E41"`. These are the "surface" elements that float above the panels.

- **Tier 2 — Panel interiors (mid):** The PanelBox content area receives `backgroundColor: "#353236"`. All three panels (EPICS, OVERVIEW, LOG) share this background, creating a unified "recessed" feel.

- **Tier 3 — Terminal background (deepest):** The terminal's own background (`#2D2A2E`) shows through in gaps between panels and around the edges, providing the deepest layer.

The three tiers progress from lightest (#403E41) through mid (#353236) to deepest (#2D2A2E), creating depth without harsh borders.

Uses Monokai Pro color values from the shared palette module (wave 2 output).

## Acceptance Criteria

- [ ] Header bar has `#403E41` background
- [ ] Hints bar has `#403E41` background
- [ ] All panel interiors have `#353236` background
- [ ] Three distinct background tiers are visible (chrome > panels > terminal)
- [ ] Tiers progress from lightest to darkest
- [ ] Background colors come from the shared Monokai Pro palette module
