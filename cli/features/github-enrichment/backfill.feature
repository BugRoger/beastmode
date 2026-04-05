@github-issue-enrichment
Feature: Existing bare issues backfilled with enriched content

  A backfill operation iterates all existing epics that have GitHub
  issues and re-syncs their issue bodies through the enrichment
  pipeline. This brings the entire issue history up to the enriched
  format without requiring manual updates.

  Scenario: Backfill enriches a bare epic issue with PRD content
    Given an existing epic has a bare GitHub issue with no PRD content
    And the epic has a design artifact with PRD sections
    When the backfill operation runs
    Then the epic issue body is updated with the PRD summary

  Scenario: Backfill enriches feature issues with descriptions
    Given an existing epic has feature issues with empty bodies
    And the epic has a plan artifact with feature descriptions
    When the backfill operation runs
    Then each feature issue body is updated with its description and user story

  Scenario: Backfill skips epics without GitHub issues
    Given an existing epic has no GitHub issue number in its manifest
    When the backfill operation runs
    Then the epic is skipped without error

  Scenario: Backfill is idempotent on already-enriched issues
    Given an existing epic has an already-enriched GitHub issue
    When the backfill operation runs
    Then the issue body content remains correct
    And no duplicate sections are added

  Scenario: Backfill processes released epics with archive tag URLs
    Given an existing released epic has a bare GitHub issue
    And the epic has an archive tag and version tag
    When the backfill operation runs
    Then the epic issue body uses the archive tag compare URL
