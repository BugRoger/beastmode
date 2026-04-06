@details-panel-stats
Feature: Details panel displays session stats when all epics are selected

  The details panel renders a stats view with three stacked sections
  when the user selects "(all)" in the epics list. The sections show
  session stats, phase duration breakdown, and retry stats.

  Background:
    Given the stats accumulator is initialized

  Scenario: Session stats section displays total and active counts
    When a session starts for epic "alpha" phase "plan"
    And a session starts for epic "beta" phase "implement"
    And the session for epic "alpha" phase "plan" completes successfully in 30000ms
    Then the stats show total sessions is 1
    And the stats show active sessions is 1

  Scenario: Session stats section displays success rate
    When a session completes for epic "a" phase "plan" with success in 10000ms
    And a session completes for epic "b" phase "plan" with success in 20000ms
    And a session completes for epic "c" phase "plan" with success in 15000ms
    And a session completes for epic "d" phase "plan" with failure in 5000ms
    Then the stats show success rate is 75

  Scenario: Session stats section displays cumulative session time
    When a session completes for epic "a" phase "plan" with success in 120000ms
    And a session completes for epic "b" phase "plan" with success in 60000ms
    Then the stats show cumulative time is 180000

  Scenario: Phase duration section shows average duration per phase
    When a session completes for epic "a" phase "plan" with success in 30000ms
    And a session completes for epic "b" phase "plan" with success in 50000ms
    Then the stats show average duration for "plan" is 40000

  Scenario: Unseen phases display no duration data
    When a session completes for epic "a" phase "plan" with success in 45000ms
    Then the stats show no duration for "implement"
    And the stats show no duration for "validate"
    And the stats show no duration for "release"

  Scenario: Retry stats section displays re-dispatch and failure counts
    When a session completes for epic "a" phase "plan" with failure in 5000ms
    And a session starts for epic "a" phase "plan" as a re-dispatch
    And a session completes for epic "a" phase "plan" with success in 10000ms
    Then the stats show re-dispatches is 1
    And the stats show failures is 1

  Scenario: Empty state before any session completes
    Then the stats accumulator reports isEmpty is true

  Scenario: Placeholder disappears after first session completes
    Then the stats accumulator reports isEmpty is true
    When a session completes for epic "a" phase "plan" with success in 10000ms
    Then the stats accumulator reports isEmpty is false

  Scenario: Stats content resolves for all selection
    When a session completes for epic "a" phase "plan" with success in 10000ms
    And I resolve details content for selection "all"
    Then the content result has kind "stats"

  Scenario: DetailsPanel source handles stats kind
    Then the DetailsPanel source contains a branch for "stats" content kind

  Scenario: Three sections rendered in order
    Then the DetailsPanel source renders sections in order: Sessions, Phase Duration, Retries
