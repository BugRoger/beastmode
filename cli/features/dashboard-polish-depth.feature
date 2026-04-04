@dashboard-polish
Feature: Background colors create a three-tier depth hierarchy

  The dashboard uses three distinct background color tiers against the
  terminal background to create visual depth without harsh borders.
  Header bar and hints bar share one tier, panel interiors use a second
  tier, and the terminal background serves as the deepest tier.

  Scenario: Header bar has its own background tier
    Given the dashboard is rendered
    When I observe the header bar background
    Then the header bar background is "#403E41"

  Scenario: Hints bar matches the header bar background tier
    Given the dashboard is rendered
    When I observe the hints bar background
    Then the hints bar background is "#403E41"

  Scenario: Panel interiors share a mid-depth background tier
    Given the dashboard is rendered
    When I observe panel interior backgrounds
    Then the panel interior background is "#353236"

  Scenario: Three tiers create distinct depth without harsh contrast
    Given the dashboard is rendered
    When I observe the overall color hierarchy
    Then three distinct background tiers are present
    And the chrome tier is "#403E41"
    And the panel tier is "#353236"
    And the terminal tier is "#2D2A2E"
