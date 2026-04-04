@dashboard-polish
Feature: Dashboard colors derive from the Monokai Pro palette

  All visible color values in the dashboard are drawn from the Monokai Pro
  palette. Borders, titles, phase indicators, and status badges each map
  to specific Monokai Pro accent values.

  Scenario: Panel borders use Monokai Pro border color
    Given the dashboard is rendered
    When I observe panel border styling
    Then panel borders use color "#727072"

  Scenario: Panel titles use Monokai Pro title color
    Given the dashboard is rendered
    When I observe panel title styling
    Then panel titles use color "#78DCE8"

  Scenario Outline: Phase indicators use distinct Monokai Pro accents
    Given the dashboard is rendered
    When I observe the indicator for phase "<phase>"
    Then the phase "<phase>" has a unique Monokai Pro accent color

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
    Then watch status colors use Monokai Pro green and red accents
