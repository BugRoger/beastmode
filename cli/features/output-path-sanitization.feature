@fix-worktree-paths
Feature: Build output stores bare filenames for artifact paths

  The buildOutput function produces the output record consumed by
  the store. Artifact path fields must contain bare filenames (no
  directory prefix, no absolute path) so downstream readers can
  resolve them against the known artifact directory.

  Scenario: Design phase output stores bare filename for artifact path
    Given a design artifact at absolute path "/worktree/.beastmode/artifacts/design/2026-04-06-test.md"
    When buildOutput processes the design artifact
    Then the output design artifact field is "2026-04-06-test.md"
    And the output design artifact field does not contain "/"

  Scenario: Validate phase output stores bare filename for report path
    Given a validate artifact at absolute path "/worktree/.beastmode/artifacts/validate/2026-04-06-test.md"
    When buildOutput processes the validate artifact
    Then the output report field is "2026-04-06-test.md"
    And the output report field does not contain "/"

  Scenario: Release phase output stores bare filename for changelog path
    Given a release artifact at absolute path "/worktree/.beastmode/artifacts/release/2026-04-06-test.md"
    When buildOutput processes the release artifact
    Then the output changelog field is "2026-04-06-test.md"
    And the output changelog field does not contain "/"

  Scenario: buildOutput preserves bare filename input unchanged
    Given a design artifact at absolute path "2026-04-06-epic.md"
    When buildOutput processes the design artifact
    Then the output design artifact field is "2026-04-06-epic.md"

  Scenario: Plan phase scan already stores bare filenames
    Given plan artifacts exist for epic "test-epic" with features "alpha" and "beta"
    When the plan features are scanned for epic "test-epic"
    Then each feature plan field is a bare filename
