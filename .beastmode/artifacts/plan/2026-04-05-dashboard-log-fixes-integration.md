# Integration Test Artifact: dashboard-log-fixes

Epic: **dashboard-log-fixes**
Date: 2026-04-05

---

## New Scenarios

### Feature: cli-verbosity-filter

Covers user stories [2, 7].

US 2 (verbosity toggle between info and debug) is largely covered by the existing `dashboard-verbosity-cycling.feature`. The existing scenarios already specify the 'v' key toggling between info and debug, immediate effect, and level-based filtering of epic/feature entries.

However, US 7 (CLI root entries also respect verbosity) is **not** covered. The existing codebase explicitly passes CLI entries through unfiltered (see `log-panel-refactor.test.ts` line 148: "CLI entries not filtered" and `tree-view.test.ts` line 228: "CLI entries are not filtered"). The new epic reverses this behavior.

```gherkin
@dashboard-log-fixes
Feature: CLI root entries respect the verbosity filter

  CLI root entries (watch start, watch stop, scan complete) are subject
  to the same verbosity filter as epic and feature entries. When the
  operator switches to info view, debug-level CLI root entries are hidden.

  Background:
    Given the dashboard is running
    And the tree state contains CLI root entries at multiple levels:
      | message        | level |
      | watch started  | debug |
      | scan complete  | debug |
      | pipeline error | warn  |

  Scenario: Info verbosity hides debug-level CLI root entries
    When the log verbosity level is "info"
    Then the CLI root entry "watch started" is not visible
    And the CLI root entry "scan complete" is not visible
    And the CLI root entry "pipeline error" is visible

  Scenario: Debug verbosity shows all CLI root entries
    When the log verbosity level is "debug"
    Then the CLI root entry "watch started" is visible
    And the CLI root entry "scan complete" is visible
    And the CLI root entry "pipeline error" is visible

  Scenario: Toggling verbosity updates CLI root entry visibility immediately
    Given the log verbosity level is "info"
    And the CLI root entry "watch started" is not visible
    When the operator presses the verbosity toggle key
    Then the CLI root entry "watch started" becomes visible

  Scenario: Warn and error CLI root entries are always visible regardless of verbosity
    When the log verbosity level is "info"
    Then CLI root entries at "warn" level are visible
    And CLI root entries at "error" level are visible
```

### Feature: version-display

Covers user stories [6].

No existing coverage. The `dashboard-polish-banner.feature` covers the BEASTMODE banner text and animated dots. The `dashboard-wiring-fix.feature` covers clock and tick rate in the header. Neither addresses version or git hash display.

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

### Feature: event-routing-and-levels

Covers user stories [1, 3, 4, 5].

Existing partial coverage:
- `hierarchical-filtering.feature` covers filtering entries by epic/feature hierarchy, but not the deduplication guarantee (US 1).
- `level-reclassification.feature` covers generic level classification rules but does not enumerate the specific event types from US 3 and US 4.
- `dead-man-switch-events.feature` covers dead session event emission but not the log level of those events.
- No existing scenario covers iTerm session ID in dispatch entries (US 5).

```gherkin
@dashboard-log-fixes
Feature: Event routing, deduplication, and level assignment

  Log entries appear exactly once in the tree hierarchy, routed to their
  parent epic. Lifecycle events are classified at the correct severity
  level. Dispatch entries include the iTerm session identifier for
  cross-referencing with terminal tabs.

  # --- US 1: Deduplication / hierarchical routing ---

  Scenario: Each log entry appears exactly once under its epic
    Given the dashboard is running with an active epic "auth-system"
    When a dispatch event is emitted for epic "auth-system"
    Then the entry appears under the "auth-system" epic node
    And the entry does not appear under the CLI root section
    And the entry does not appear under any other epic node

  Scenario: An entry routed to a feature does not also appear at epic level
    Given the dashboard is running with epic "auth-system" and feature "login"
    When an implement event is emitted for feature "login" of epic "auth-system"
    Then the entry appears under feature "login" of epic "auth-system"
    And the entry does not also appear directly under the "auth-system" epic node

  # --- US 3: Debug-level lifecycle events ---

  Scenario Outline: Lifecycle heartbeats and bookends are classified as debug
    Given the watch loop is running
    When a "<event_kind>" event occurs
    Then the log entry is classified at "debug" level

    Examples:
      | event_kind        |
      | scan-complete     |
      | watch-start       |
      | watch-stop        |
      | session-started   |
      | session-completed |

  Scenario: Scan-complete heartbeats are hidden at info verbosity
    Given the dashboard is running at info verbosity
    When a scan-complete heartbeat event is emitted
    Then the scan-complete entry is not visible in the log panel

  Scenario: Session lifecycle bookends are hidden at info verbosity
    Given the dashboard is running at info verbosity
    When a session-started event is emitted
    And a session-completed event is emitted
    Then neither the session-started nor session-completed entry is visible

  # --- US 4: Warn-level abnormal condition events ---

  Scenario Outline: Abnormal conditions are classified as warn
    Given the watch loop is running
    When a "<event_kind>" event occurs
    Then the log entry is classified at "warn" level

    Examples:
      | event_kind          |
      | dead-session        |
      | epic-blocked        |
      | release-held        |

  Scenario: Warn-level events are always visible at info verbosity
    Given the dashboard is running at info verbosity
    When a dead-session re-dispatch event is emitted
    Then the dead-session entry is visible in the log panel

  Scenario: Epic-blocked stands out at default verbosity
    Given the dashboard is running at info verbosity
    When an epic-blocked event is emitted for epic "auth-system"
    Then the epic-blocked entry is visible under "auth-system"

  # --- US 5: iTerm session ID in dispatch entries ---

  Scenario: Dispatch log entry includes the iTerm session identifier
    Given the watch loop is running
    When a phase is dispatched with iTerm session "w:12345"
    Then the dispatch log entry contains "session: w:12345"

  Scenario: Dispatch entry without an iTerm session omits the session field
    Given the watch loop is running
    When a phase is dispatched without an iTerm session
    Then the dispatch log entry does not contain a session identifier

  Scenario Outline: Session ID format matches iTerm window identifier pattern
    Given the watch loop is running
    When a phase is dispatched with iTerm session "<session_id>"
    Then the dispatch log entry contains "session: <session_id>"

    Examples:
      | session_id |
      | w:12345    |
      | w:67890    |
      | w:1        |
```

---

## Modified Scenarios

### 1. `cli/features/dashboard-verbosity-cycling.feature` -- "Log entries are filtered by current verbosity level"

**What changed:** The existing scenario (line 32-37) states that at info verbosity "only info-level and above log entries are visible." With US 7, this now explicitly includes CLI root entries in the filtering scope. The existing scenario's intent is correct but vague about CLI entries. The scenario should be updated to clarify that the filtering applies to all entry sources including CLI root.

**Why:** US 7 requires CLI root entries to also respect the verbosity filter. The existing scenario does not distinguish between epic entries and CLI root entries, which allowed the current implementation to skip CLI filtering.

```gherkin
@dashboard-log-fixes
@logging-cleanup
Feature: Operator cycles log verbosity with keyboard shortcut

  The operator can press 'v' in the dashboard to toggle between log
  verbosity levels: info and debug. The toggle wraps from debug back
  to info. The change takes effect immediately without restarting the
  dashboard.

  Scenario: Default log verbosity is info
    Given the dashboard is running
    When no verbosity changes have been made
    Then the log verbosity level is "info"

  Scenario Outline: Pressing v toggles between verbosity levels
    Given the dashboard is running
    And the current log verbosity level is "<current>"
    When the operator presses the verbosity toggle key
    Then the log verbosity level changes to "<next>"

    Examples:
      | current | next  |
      | info    | debug |
      | debug   | info  |

  Scenario: Verbosity change takes effect immediately
    Given the dashboard is running
    And the log verbosity level is "info"
    When the operator presses the verbosity toggle key
    Then the log panel immediately reflects the "debug" verbosity level
    And no dashboard restart is required

  Scenario: Log entries from all sources are filtered by current verbosity level
    Given the dashboard is running
    And the log verbosity level is "info"
    Then only info-level and above log entries are visible across all sources
    And debug-level entries under epics are hidden
    And debug-level entries under CLI root are hidden
    When the operator presses the verbosity toggle key
    Then debug-level log entries from all sources are also visible
```

### 2. `cli/features/level-reclassification.feature` -- "Log levels follow classification rules" Examples table

**What changed:** The existing Scenario Outline examples table (line 27-38) covers generic situations. US 3 and US 4 add specific event types that must be classified at defined levels. The examples table should be extended with the new event-to-level mappings.

**Why:** US 3 reclassifies scan-complete heartbeats, watch lifecycle, and session bookends as debug. US 4 reclassifies dead-session re-dispatch, epic-blocked, and release-held as warn. These specific mappings need to be in the classification rules.

```gherkin
@dashboard-log-fixes
@logging-cleanup
Feature: Log call sites use the correct level classification

  All log call sites are reviewed and assigned to the correct level.
  Info-level output is clean operator-facing status. Debug-level
  output contains implementation details and lifecycle heartbeats.
  Warn indicates recoverable issues and abnormal conditions. Error
  indicates unrecoverable failures.

  Scenario: Recoverable scan failures are logged as warnings
    Given the watch loop is running
    When a state scan fails but the loop continues
    Then the failure is logged at warn level
    And the failure is not logged at error level

  Scenario: Default info output contains only operator-facing status
    Given the CLI is running at default info verbosity
    When a pipeline phase completes normally
    Then the log output contains phase completion status
    And the log output does not contain internal implementation details

  Scenario: Debug output contains implementation details
    Given the CLI is running at debug verbosity
    When a pipeline phase completes normally
    Then the log output contains phase completion status
    And the log output also contains implementation-level details

  Scenario Outline: Log levels follow classification rules
    Given a log message about "<situation>"
    Then the message is classified at "<level>" level

    Examples:
      | situation                        | level |
      | phase completed successfully     | info  |
      | file written to disk             | debug |
      | state scan failed but continuing | warn  |
      | unrecoverable dispatch failure   | error |
      | config loaded                    | debug |
      | epic advanced to next phase      | info  |
      | scan complete heartbeat          | debug |
      | watch loop started               | debug |
      | watch loop stopped               | debug |
      | session started                  | debug |
      | session completed                | debug |
      | dead session re-dispatch         | warn  |
      | epic blocked                     | warn  |
      | release held                     | warn  |
```

---

## Deleted Scenarios

No existing scenarios need to be deleted. The modified scenarios above supersede their prior versions in-place. The unit test assertions in `log-panel-refactor.test.ts` (line 148-156, "CLI entries not filtered") and `tree-view.test.ts` (line 228-237, "CLI entries are not filtered") describe the **old** behavior that US 7 reverses, but those are unit tests, not `.feature` file scenarios, so they fall outside the scope of this artifact. The implementer will need to update those unit tests to match the new behavior.
