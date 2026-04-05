---
phase: plan
slug: ed09f0
epic: dashboard-log-fixes
feature: version-display
wave: 1
---

# Version Display

**Design:** `.beastmode/artifacts/design/2026-04-05-ed09f0.md`

## User Stories

1. As a pipeline operator, I want to see the current version and git hash under the clock in the top-right header (e.g., "v0.96.0 (a1b2c3d)"), so that I know which build is running.

## What to Build

The WatchLoop `started` event payload already includes a `version` field. Capture this version string in App component state when the `started` event fires. Pass it as a new `version` prop to ThreePanelLayout.

In ThreePanelLayout, render the version string below the clock line in the top-right header area, using the muted chrome color. The version display should include the version number and an abbreviated git hash in the format "v0.96.0 (a1b2c3d)".

The git hash needs to be resolved at watch loop startup time. Check whether the `started` event payload already includes it, or whether it needs to be read from `git rev-parse --short HEAD` in the App component.

## Integration Test Scenarios

```gherkin
@dashboard-log-fixes
Feature: Dashboard header displays current version and git hash

  The dashboard header shows the current build version and abbreviated
  git commit hash below the clock in the top-right region, so the
  operator can identify which build is running.

  Scenario: Version and git hash appear in the header
    Given the dashboard is running
    And the current version is "v0.96.0"
    And the current git hash is "a1b2c3d"
    When the operator observes the header region
    Then the header displays "v0.96.0 (a1b2c3d)"

  Scenario: Version display is positioned below the clock
    Given the dashboard is running
    When the operator observes the top-right header area
    Then the clock appears above the version display
    And the version display appears below the clock

  Scenario: Git hash is abbreviated to seven characters
    Given the dashboard is running
    And the full git hash is "a1b2c3d4e5f6a7b8c9d0"
    When the operator observes the version display
    Then the displayed git hash is exactly seven characters long

  Scenario: Version display updates reflect the running build
    Given the dashboard is running with version "v0.97.0" and hash "f4e5d6c"
    When the operator observes the header region
    Then the header displays "v0.97.0 (f4e5d6c)"
```

## Acceptance Criteria

- [ ] Version string captured from WatchLoop `started` event payload
- [ ] Version rendered below the clock in the top-right header area
- [ ] Display format is "vX.Y.Z (abcdef0)" with 7-char abbreviated git hash
- [ ] Version text uses muted chrome color
- [ ] Version is empty/hidden before the first `started` event fires
