Feature: Watch loop happy path -- two epics, parallel phases, serial release

  The watch loop drives multiple epics autonomously. Non-release phases
  execute in parallel across epics. Implement features fan out within
  each epic but respect dependency ordering (independent features complete before
  dependent features). Release is serialized -- only one epic releases at a time.

  This feature exercises the WatchLoop class with two epics, each having
  multiple features with dependencies. The mock boundary is scanEpics and
  SessionFactory -- everything else (tracker, event dispatch, release
  serialization, rescan chaining) runs for real.

  Scenario: Two epics from plan through release

    # -- Setup: define two epics with dependency-ordered features --
    Given epic "auth-system" with features:
      | feature        | depends_on                |
      | auth-provider  |                           |
      | login-flow     |                           |
      | token-refresh  | auth-provider,login-flow  |
    And epic "data-pipeline" with features:
      | feature   | depends_on |
      | ingestion |            |
      | transform | ingestion  |
      | export    | ingestion  |
    And the watch loop is initialized

    # -- Plan phase: both epics dispatch in parallel --
    When both epics are seeded in "design" phase with next action "plan"
    And the watch loop ticks
    Then sessions should be active for:
      | epic          | phase |
      | auth-system   | plan  |
      | data-pipeline | plan  |

    # -- Plan completes → implement fan-out (independent features only) --
    When all active sessions complete successfully
    Then sessions should be active for:
      | epic          | phase     |
      | auth-system   | implement |
      | data-pipeline | implement |
    And implement sessions should respect dependency ordering:
      | epic          | active features          | held features   |
      | auth-system   | auth-provider,login-flow | token-refresh   |
      | data-pipeline | ingestion                | transform,export |

    # -- Independent features complete → dependent features dispatch --
    When all active sessions complete successfully
    Then implement sessions should respect dependency ordering:
      | epic          | active features  | held features |
      | auth-system   | token-refresh    |               |
      | data-pipeline | transform,export |               |

    # -- Wave 2 completes → validate (parallel) --
    When all active sessions complete successfully
    Then sessions should be active for:
      | epic          | phase    |
      | auth-system   | validate |
      | data-pipeline | validate |

    # -- Validate completes → release (serialized!) --
    When all active sessions complete successfully
    Then 1 release session should be active
    And 1 release should be held

    # -- First release completes, poll picks up held epic --
    When the active release session completes successfully
    And the watch loop ticks
    Then 1 release session should be active
    And 0 releases should be held

    # -- Second release completes → both epics done --
    When the active release session completes successfully
    Then the dispatch log should have 12 total dispatches
    And both epics should be at phase "done"
