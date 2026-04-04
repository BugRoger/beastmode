@github-issue-enrichment
Feature: GitHub issues created pre-dispatch for commit reference availability

  GitHub issues are created before the phase dispatch runs, not after
  checkpoint. This ensures issue numbers are available from the very
  first commit of a phase session.

  Background:
    Given GitHub issue creation is enabled in the configuration

  Scenario: Epic issue exists before design phase dispatch begins
    Given a new epic is starting the design phase
    When the pipeline prepares for dispatch
    Then a GitHub issue is created for the epic before the phase skill runs
    And the issue number is recorded in the manifest

  Scenario: Feature issues exist before implement phase dispatch begins
    Given an epic has completed planning with two features
    When the pipeline prepares for the implement phase
    Then GitHub issues are created for each feature before any skill runs
    And each feature's issue number is recorded in the manifest

  Scenario: Pre-dispatch issue is a minimal stub
    Given a new epic is starting the design phase
    When the pre-dispatch issue creation runs
    Then the issue is created with the slug as its title
    And the issue body is a minimal placeholder pending enrichment

  Scenario: Pre-dispatch issue creation is idempotent
    Given an epic already has a GitHub issue number in its manifest
    When the pipeline prepares for dispatch again
    Then no duplicate issue is created
    And the existing issue number is preserved

  Scenario: Feature issue creation does not run for non-implement phases
    Given an epic is at the validate phase with features that have issue numbers
    When the pipeline prepares for the validate phase dispatch
    Then no new feature issues are created
