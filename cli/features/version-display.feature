@dashboard-log-fixes
Feature: Dashboard header displays current version and git hash

  The dashboard header shows the current build version and abbreviated
  git commit hash below the clock in the top-right region, so the
  operator can identify which build is running.

  Scenario: Version string is captured from started event
    Given the dashboard source is loaded
    When I examine the App component's started event handler
    Then the handler captures the version from the event payload

  Scenario: Version is passed as a prop to ThreePanelLayout
    Given the dashboard source is loaded
    When I examine the App component's JSX
    Then ThreePanelLayout receives a version prop

  Scenario: ThreePanelLayout accepts a version prop
    Given the dashboard source is loaded
    When I examine the ThreePanelLayout props interface
    Then the interface includes an optional version prop of type string

  Scenario: Version renders below the clock
    Given the dashboard source is loaded
    When I examine the ThreePanelLayout header region
    Then the version text element appears after the clock element

  Scenario: Version uses muted chrome color
    Given the dashboard source is loaded
    When I examine the version text element
    Then the version text uses CHROME.muted color

  Scenario: Version is hidden before started event
    Given the dashboard source is loaded
    When I examine the version rendering logic
    Then the version element is conditionally rendered only when version is truthy
