Feature: Design slug rename end-to-end

  The design phase creates a manifest with a hex-like slug for isolation.
  When the designer chooses a readable epic name (e.g., "oauth-redesign"),
  the design artifact includes both the original slug and the new epic name.
  The pipeline's design phase reconciler renames the manifest, worktree
  directory, and git branch atomically.

  This feature exercises the design slug rename flow: start with hex slug →
  seed manifest → design dispatch writes artifact with epic name → pipeline
  renames manifest and worktree → subsequent phases operate on new slug.

  Scenario: Design phase renames hex slug to readable epic name

    # -- Setup: hex slug with isolated worktree --
    Given the initial epic slug is "d1e2f3a4b5c6"
    And a manifest is seeded for slug "d1e2f3a4b5c6"

    # -- Design with epic name different from slug --
    When the dispatch will write a design artifact:
      | field     | value                              |
      | phase     | design                             |
      | epic-slug | d1e2f3a4b5c6                       |
      | problem   | OAuth flow is outdated             |
      | solution  | Implement modern OAuth2 with PKCE |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the manifest slug should be "oauth-redesign"
    And the manifest phase should be "plan"
    And the manifest summary problem should be "OAuth flow is outdated"
    And the worktree should exist for slug "oauth-redesign"
    And the git branch "feature/oauth-redesign" should exist
    And the manifest for slug "d1e2f3a4b5c6" should not exist

    # -- Plan on renamed slug --
    When the dispatch will write plan artifacts:
      | feature        | wave | description           |
      | oauth-provider | 1    | OAuth provider config |
      | pkce-flow      | 1    | PKCE authorization    |
      | token-endpoint | 2    | Token endpoint impl   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"
    And the manifest should have 3 features
    And all features should have status "pending"

    # -- Implement first feature on renamed slug --
    When the dispatch will write an implement artifact for feature "oauth-provider"
    And the pipeline runs the "implement" phase for feature "oauth-provider"
    Then the pipeline result should be successful
    And feature "oauth-provider" should have status "completed"
