---
phase: plan
slug: dashboard-polish
epic: dashboard-polish
feature: integration-tests
wave: 1
---

# Integration Tests

**Design:** `.beastmode/artifacts/design/2026-04-04-dashboard-polish.md`

## User Stories

1. As a user, I want the banner to correctly spell "BEASTMODE" with trailing animated dots matching the README SVG, so the dashboard looks polished and consistent with the project branding.
2. As a user, I want a vertical split layout (LEFT: EPICS 60% + OVERVIEW 40% stacked at 35% width | RIGHT: LOG at 65% width full height), so the log panel has maximum vertical real estate for reading session output while epics and overview remain accessible.
3. As a user, I want all dashboard colors derived from the Monokai Pro palette (borders #727072, titles #78DCE8, phase colors mapped to unique accents, status colors), so the TUI feels native to my terminal theme.
4. As a user, I want the banner gradient to use 256-step smooth interpolation between the nyan cat rainbow colors with wide bands, so the animation looks like a slow, buttery color wash instead of a flickering rainbow.
5. As a user, I want background colors on the header bar (#403E41), hints bar (#403E41), and panel interiors (#353236) creating a three-tier depth hierarchy against the terminal background (#2D2A2E), so UI regions are visually distinct without harsh borders.
6. As a user, I want the outer chrome border removed and panel titles rendered cleanly within their own PanelBox borders, so the "EPICS" and "OVERVIEW" labels no longer collide with stray border lines.

## What to Build

Write BDD integration test scenarios and step definitions covering all six user stories. The integration artifact at `.beastmode/artifacts/plan/2026-04-04-dashboard-polish-integration.md` contains the complete Gherkin specifications:

- **18 new scenarios** across 5 feature groups (banner text, Monokai palette, smooth gradient, depth hierarchy, outer chrome removal)
- **4 modified scenarios** updating existing dashboard-wiring-fix feature file for new layout geometry, gradient behavior, log panel placement, and end-to-end verification
- **1 deleted scenario** (TwoColumnLayout negative assertion — obsolete)

The implementer writes `.feature` files, step definitions, and configures the test runner to execute these scenarios against the dashboard component tree.

## Acceptance Criteria

- [ ] Banner text reads BEASTMODE scenario passes
- [ ] Banner has trailing animated dots scenario passes
- [ ] Trailing dots match README SVG branding scenario passes
- [ ] Panel borders use Monokai Pro border color scenario passes
- [ ] Panel titles use Monokai Pro title color scenario passes
- [ ] Phase indicators use distinct Monokai Pro accents scenario passes (5 examples)
- [ ] Status colors derive from Monokai Pro palette scenario passes
- [ ] Gradient uses 256-step interpolation scenario passes
- [ ] Color bands appear smooth scenario passes
- [ ] Animation speed produces slow color wash scenario passes
- [ ] Header bar has own background tier scenario passes
- [ ] Hints bar matches header bar background tier scenario passes
- [ ] Panel interiors share mid-depth background tier scenario passes
- [ ] Three tiers create distinct depth scenario passes
- [ ] No outer chrome border wraps the dashboard scenario passes
- [ ] Each panel has self-contained PanelBox border with clean title scenario passes (3 panels)
- [ ] Layout uses vertical split with correct proportions scenario passes
- [ ] Rainbow banner uses smooth gradient interpolation scenario passes
- [ ] Log panel renders at full terminal height in right column scenario passes
- [ ] All dashboard-polish requirements work together scenario passes
- [ ] Obsolete TwoColumnLayout scenario is removed
