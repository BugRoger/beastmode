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
    When I observe the banner region
    Then the banner has trailing dot characters

  Scenario: Trailing dots match the README SVG branding
    Given the dashboard is rendered
    When I observe the banner region
    Then the banner trailing dots use the block character pattern
