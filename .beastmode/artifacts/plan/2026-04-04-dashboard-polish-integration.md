# Integration Artifact — dashboard-polish

Epic: **dashboard-polish**
Date: 2026-04-04

---

## New Scenarios

### Banner Text and Animated Dots

```gherkin
@dashboard-polish
Feature: Banner displays BEASTMODE text with animated trailing dots

  The dashboard banner renders the word "BEASTMODE" as its primary text
  content, with trailing dots that animate over time to convey activity.

  Scenario: Banner text reads BEASTMODE
    Given the dashboard is rendered
    When I observe the banner region
    Then the banner displays the text "BEASTMODE"

  Scenario: Banner has trailing animated dots
    Given the dashboard is rendered
    When the animation advances by one tick
    Then the number of trailing dots after "BEASTMODE" changes

  Scenario: Trailing dots match the README SVG branding
    Given the dashboard is rendered
    And the project README SVG banner is loaded
    When I compare the banner dot animation style
    Then the dashboard dots use the same trailing-dot pattern as the SVG
```

### Monokai Pro Color Palette

```gherkin
@dashboard-polish
Feature: Dashboard colors derive from the Monokai Pro palette

  All visible color values in the dashboard are drawn from the Monokai Pro
  palette. Borders, titles, phase indicators, and status badges each map
  to specific Monokai Pro accent values.

  Scenario: Panel borders use Monokai Pro border color
    Given the dashboard is rendered
    When I observe panel border styling
    Then panel borders use the Monokai Pro gray accent

  Scenario: Panel titles use Monokai Pro title color
    Given the dashboard is rendered
    When I observe panel title styling
    Then panel titles use the Monokai Pro cyan accent

  Scenario Outline: Phase indicators use distinct Monokai Pro accents
    Given the dashboard is rendered
    When I observe the indicator for phase "<phase>"
    Then the phase indicator uses a unique Monokai Pro accent color
    And no two phases share the same accent color

    Examples:
      | phase     |
      | design    |
      | plan      |
      | implement |
      | validate  |
      | release   |

  Scenario: Status colors derive from the Monokai Pro palette
    Given the dashboard is rendered
    When I observe status badge colors
    Then each status color is a recognized Monokai Pro palette value
```

### Smooth Gradient Banner Animation

```gherkin
@dashboard-polish
Feature: Banner gradient uses 256-step smooth color interpolation

  The banner animation interpolates between nyan cat rainbow colors using
  256 discrete steps per color transition, producing wide bands and a slow,
  smooth color wash effect rather than a flickering rainbow.

  Scenario: Gradient uses 256-step interpolation between color stops
    Given the banner color engine is initialized
    When I query the number of interpolation steps between adjacent color stops
    Then the interpolation uses 256 steps per transition

  Scenario: Color bands are wide enough to appear smooth
    Given the banner color engine is initialized
    When I render one frame of the banner gradient
    Then adjacent characters share visually similar colors
    And the gradient does not produce abrupt color jumps

  Scenario: Animation speed produces a slow color wash
    Given the banner color engine is initialized
    When the animation advances by one tick
    Then the gradient shifts by a small offset
    And the visual effect is a slow lateral color movement
```

### Three-Tier Background Depth Hierarchy

```gherkin
@dashboard-polish
Feature: Background colors create a three-tier depth hierarchy

  The dashboard uses three distinct background color tiers against the
  terminal background to create visual depth without harsh borders.
  Header bar and hints bar share one tier, panel interiors use a second
  tier, and the terminal background serves as the deepest tier.

  Scenario: Header bar has its own background tier
    Given the dashboard is rendered
    When I observe the header bar background
    Then the header bar background is visually distinct from the terminal background
    And the header bar background is visually distinct from the panel interior background

  Scenario: Hints bar matches the header bar background tier
    Given the dashboard is rendered
    When I observe the hints bar background
    Then the hints bar background matches the header bar background

  Scenario: Panel interiors share a mid-depth background tier
    Given the dashboard is rendered
    When I observe the panel interior backgrounds
    Then all panel interiors use the same background color
    And the panel interior background is between the header tier and the terminal background in brightness

  Scenario: Three tiers create distinct depth without harsh contrast
    Given the dashboard is rendered
    When I observe the overall color hierarchy
    Then three distinct background tiers are visible
    And the tiers progress from lightest at chrome level to darkest at terminal level
```

### Outer Chrome Border Removal and Clean Panel Titles

```gherkin
@dashboard-polish
Feature: Outer chrome border removed and panel titles render within PanelBox borders

  The dashboard does not render an outer chrome border wrapping the entire
  TUI. Each panel uses its own PanelBox border with the title rendered
  cleanly within that border, eliminating collisions between panel labels
  and stray border lines.

  Scenario: No outer chrome border wraps the dashboard
    Given the dashboard is rendered
    When I observe the outermost layout container
    Then the outermost container has no visible border

  Scenario: Each panel has its own PanelBox border with a clean title
    Given the dashboard is rendered
    When I observe the epics panel
    Then the epics panel has a self-contained border with title "EPICS"
    And the title does not collide with any adjacent border line

  Scenario: Overview panel title renders within its own border
    Given the dashboard is rendered
    When I observe the overview panel
    Then the overview panel has a self-contained border with title "OVERVIEW"
    And the title does not collide with any adjacent border line

  Scenario: Log panel title renders within its own border
    Given the dashboard is rendered
    When I observe the log panel
    Then the log panel has a self-contained border with title "LOG"
    And the title does not collide with any adjacent border line
```

---

## Modified Scenarios

### File: `cli/features/dashboard-wiring-fix.feature`

#### Scenario: Layout has epics, overview, and log panels with correct proportions (line 30)

**What changed:** The PRD specifies a vertical split layout (LEFT column at 35% width containing EPICS 60% + OVERVIEW 40% stacked, RIGHT column at 65% width containing LOG full height). The existing scenario describes a horizontal top/bottom split with different proportions (top 35% height, epics 30% width, overview 70% width, log flexGrow). The entire layout geometry must change.

**Updated Gherkin:**

```gherkin
@dashboard-polish
  Scenario: Layout uses vertical split with left column and right log panel
    Given the ThreePanelLayout source is loaded
    When I check panel dimensions
    Then the left column width is "35%"
    And the right column width is "65%"
    And within the left column the epics panel takes "60%" of the vertical space
    And within the left column the overview panel takes "40%" of the vertical space
    And the log panel fills the full height of the right column
```

#### Scenario: Rainbow banner cycles through animation frames (line 23)

**What changed:** The PRD specifies 256-step smooth interpolation between nyan cat rainbow colors with wide bands. The existing scenario only verifies that color changes on tick advancement. Updated to verify smooth interpolation behavior.

**Updated Gherkin:**

```gherkin
@dashboard-polish
  Scenario: Rainbow banner uses smooth gradient interpolation across frames
    Given the nyan color runtime is loaded
    When the tick offset advances by 1
    Then the color assigned to charIndex 0 changes
    And adjacent character colors differ by at most one interpolation step
```

#### Scenario: Log panel renders at full terminal height below top section (line 58)

**What changed:** The PRD replaces the horizontal top/bottom layout with a vertical left/right split. The log panel now occupies the full height of the right column, not "remaining vertical space below top section."

**Updated Gherkin:**

```gherkin
@dashboard-polish
  Scenario: Log panel renders at full terminal height in the right column
    Given the ThreePanelLayout source is loaded
    When I check the log panel
    Then the log panel occupies the full height of the right column
    And the outer container uses a horizontal split layout
```

#### Scenario: All flashy-dashboard requirements work together (line 79)

**What changed:** The end-to-end scenario must reflect the new vertical split layout, Monokai Pro palette, smooth gradient, background depth tiers, and clean PanelBox borders without outer chrome.

**Updated Gherkin:**

```gherkin
@dashboard-polish
  Scenario: All dashboard-polish requirements work together
    Given the App component source is loaded
    And the ThreePanelLayout source is loaded
    And the nyan color runtime is loaded
    When I verify all dashboard-polish requirements
    Then App renders ThreePanelLayout as the top-level layout
    And the header contains a NyanBanner component displaying "BEASTMODE" with trailing dots
    And all three panels have self-contained PanelBox borders with clean titles
    And the layout uses a vertical split with left column at 35% and right column at 65%
    And the overview panel is a static display component in the left column below epics
    And the log panel fills full height in the right column
    And panel borders use the Monokai Pro gray accent
    And panel titles use the Monokai Pro cyan accent
    And three background depth tiers are visible
    And the outermost container has no chrome border
    And the banner gradient uses smooth 256-step interpolation
```

---

## Deleted Scenarios

### File: `cli/features/dashboard-wiring-fix.feature`

#### Scenario: App renders ThreePanelLayout instead of TwoColumnLayout (line 10)

**Why obsolete:** This scenario was written for the dashboard-wiring-fix epic to verify the migration from TwoColumnLayout to ThreePanelLayout. That migration is complete and the dashboard-polish epic does not introduce or reference TwoColumnLayout. The negative assertion ("App does not render TwoColumnLayout") is no longer meaningful. The updated end-to-end scenario already asserts ThreePanelLayout is the top-level layout.

---

## Summary

| Category | Count |
|----------|-------|
| New scenarios | 18 |
| Modified scenarios | 4 |
| Deleted scenarios | 1 |
