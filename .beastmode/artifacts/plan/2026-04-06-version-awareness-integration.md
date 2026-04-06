# Integration Artifact: version-awareness

Epic: version-awareness
Date: 2026-04-06
Feature: version-consolidation

---

## New Scenarios

### Feature: version-consolidation

Covers user stories [1, 2, 3, 4].

```gherkin
@version-awareness
Feature: Version resolution from plugin.json

  All version displays across the CLI and dashboard resolve from
  .claude-plugin/plugin.json as the single source of truth. The shared
  version module discovers plugin.json relative to its own file location
  and formats the result as "v{semver}". When plugin.json is unreadable,
  the module returns "unknown" instead of crashing.

  Background:
    Given the project has a plugin.json with version "0.102.0"

  Scenario: CLI help displays the plugin.json version
    When the user runs the help command
    Then the help output includes the version "v0.102.0"

  Scenario: Dashboard displays the plugin.json version
    When the dashboard receives the started event
    Then the dashboard header shows the version "v0.102.0"

  Scenario: Version display omits git hash
    When the user runs the help command
    Then the version output does not include a git commit hash

  Scenario: Shared version module resolves from plugin.json
    When the version module resolves the current version
    Then it reads the version field from plugin.json
    And it returns "v0.102.0"

  Scenario: Version module returns unknown when plugin.json is missing
    Given plugin.json does not exist
    When the version module resolves the current version
    Then it returns "unknown"

  Scenario: Version module returns unknown when plugin.json is malformed
    Given plugin.json contains invalid JSON
    When the version module resolves the current version
    Then it returns "unknown"

  Scenario Outline: Version format is consistent across consumers
    Given the project has a plugin.json with version "<semver>"
    When <consumer> displays the version
    Then the displayed version is "v<semver>"

    Examples:
      | semver  | consumer      |
      | 1.0.0   | the CLI help  |
      | 1.0.0   | the dashboard |
      | 0.99.0  | the CLI help  |
      | 0.99.0  | the dashboard |
```

---

## Modified Scenarios

### File: `cli/features/version-display.feature`

**What changed:** The design removes git hash from version display and consolidates all version reads to plugin.json. The existing feature description references "git hash" which is now obsolete per design decision. The feature description should be updated to reflect plugin.json as the version source and remove the git hash reference.

**Updated Gherkin:**

```gherkin
@dashboard-log-fixes
Feature: Dashboard header displays current version

  The dashboard header shows the current build version below the clock
  in the top-right region, so the operator can identify which build is
  running. The version originates from plugin.json via the shared
  version module.

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
```

**Why:** The feature description previously said "displays current version and git hash." The design decision explicitly removes git hash from the display format (it's meaningless when beastmode is installed as a plugin into another project). The description is updated to reflect plugin.json as the version source and remove the git hash reference. Individual scenarios remain unchanged -- they test rendering mechanics that are still valid regardless of version source.

---

## Deleted Scenarios

None. All existing scenarios in `version-display.feature` remain valid -- they test dashboard rendering mechanics (prop passing, conditional display, styling) that are unaffected by the version source change.
