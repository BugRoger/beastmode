@heartbeat-countdown-timer-b2b8 @watch-loop
Feature: WatchLoop scan-started event -- new event emitted at scan boundary

  The WatchLoop emits a scan-started event at the beginning of each scan
  cycle. The existing scan-complete event gains a trigger field to
  distinguish poll-triggered from event-triggered completions.

  Scenario: WatchLoop emits scan-started before scanning epics
    Given the watch loop is initialized with a configured interval
    When the watch loop performs a scheduled tick
    Then a "scan-started" event is emitted before epics are scanned

  Scenario: Poll-triggered scan-complete carries trigger field
    Given the watch loop is initialized with a configured interval
    When the watch loop performs a scheduled tick
    And the scan completes
    Then the "scan-complete" event includes a trigger value of "poll"

  Scenario: Event-triggered scan-complete carries trigger field
    Given the watch loop is running
    When a session completion triggers an immediate rescan
    And the rescan completes
    Then the "scan-complete" event includes a trigger value of "event"
