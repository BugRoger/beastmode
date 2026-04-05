---
phase: plan
slug: dashboard-extensions
epic: dashboard-extensions
feature: focus-border
wave: 2
---

# Focus Border

**Design:** `.beastmode/artifacts/design/2026-04-05-dashboard-extensions.md`

## User Stories

8. As a user, I want Tab to switch focus between the Epics panel and the Log panel, with the focused panel's border animating in sync with the nyan banner's leftmost color position, so that focus state is visually obvious and distinctive.

## What to Build

**PanelBox borderColor prop:** Extend the `PanelBox` component to accept an optional `borderColor` prop. When provided, it overrides the default `CHROME.border` for both the top border text color and the `borderColor` on the Ink `Box`. This enables the caller to pass a dynamic color that animates each tick.

**Nyan tick exposure:** The `NyanBanner` component currently manages its tick state internally. Extract the tick value so it can be shared. The simplest approach is to lift the tick state to the parent (App.tsx) and pass it down to both `NyanBanner` and the layout. Alternatively, expose a shared ref or context. The tick is incremented every 80ms. The focused panel border color is computed as `NYAN_PALETTE[tick % 256]` using the existing 256-step palette from `nyan-colors.ts`.

**Unfocused panel default:** When a panel is not focused, its `PanelBox` uses the default `CHROME.border` color (no `borderColor` prop passed or `undefined`). Only the focused panel receives the animated color.

**Animation sync:** The border color must update in sync with the nyan banner's 80ms tick. Since both consume the same tick value, they naturally stay in sync. No separate timer needed for the border — it derives from the same tick.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] `PanelBox` accepts an optional `borderColor` prop
- [ ] When `borderColor` is provided, top border text and Ink box `borderColor` use it
- [ ] When `borderColor` is undefined, default `CHROME.border` is used
- [ ] Nyan tick state is accessible outside `NyanBanner` (lifted or shared)
- [ ] Focused panel border color is `NYAN_PALETTE[tick % 256]`
- [ ] Unfocused panel uses default border color
- [ ] Border animation is in sync with nyan banner (same tick source)
