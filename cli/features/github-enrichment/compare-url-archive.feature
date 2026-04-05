@github-issue-enrichment
Feature: Compare URL switches to archive tag range after release

  When an epic is released, the feature branch is deleted. The compare
  URL switches from a branch-based range to an archive-tag-based range
  so the diff link continues to work for closed epics.

  Scenario: Released epic body uses archive tag range for compare URL
    Given an epic has been released with a version tag
    And an archive tag exists for the feature branch
    When the epic issue body is enriched after release
    Then the compare URL uses the version tag as the base
    And the compare URL uses the archive tag as the head

  Scenario: Compare URL works after feature branch deletion
    Given an epic has been released and its feature branch deleted
    When a user follows the compare URL in the epic issue body
    Then the URL resolves to a valid archived diff range

  Scenario: Epic without archive tag retains branch-based compare URL
    Given an epic has been released but no archive tag was created
    When the epic issue body is enriched after release
    Then the compare URL falls back to the branch-based range
