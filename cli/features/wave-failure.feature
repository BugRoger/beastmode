Feature: Dependency ordering in watch loop -- feature dispatch respects dependencies

  The watch loop drives implement phases as parallel feature dispatches within
  each epic. Dependency ordering is enforced: features with no deps must complete before
  features that depend on them are dispatched, even if there are enough parallel slots.

  This feature exercises the dependency ordering logic across a multi-dependency epic.

  Scenario: Multi-feature implementation respects dependency ordering

    # -- Setup: define epic with dependency-ordered features --
    Given epic "auth-system" with features:
      | feature        | depends_on                |
      | auth-provider  |                           |
      | login-flow     |                           |
      | token-refresh  | auth-provider,login-flow  |
    And the watch loop is initialized

    # -- Plan phase: dispatch plan --
    When both epics are seeded in "design" phase with next action "plan"
    And the watch loop ticks
    Then sessions should be active for:
      | epic        | phase |
      | auth-system | plan  |

    # -- Plan completes → implement fan-out (independent features) --
    When all active sessions complete successfully
    Then implement sessions should respect dependency ordering:
      | epic        | active features          | held features |
      | auth-system | auth-provider,login-flow | token-refresh |

    # -- Independent features complete → dependent features dispatch --
    When all active sessions complete successfully
    Then implement sessions should respect dependency ordering:
      | epic        | active features | held features |
      | auth-system | token-refresh   |               |

    # -- Wave 2 completes → validate --
    When all active sessions complete successfully
    Then sessions should be active for:
      | epic        | phase    |
      | auth-system | validate |
