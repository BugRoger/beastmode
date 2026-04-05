---
phase: release
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment
bump: minor
---

# Release: github-issue-enrichment

**Version:** v0.88.0
**Date:** 2026-04-05

## Highlights

Adds GitHub issue enrichment pipeline: commit-issue cross-references, compare URLs in epic bodies, early issue creation before dispatch, artifact path wiring through reconcile, and a backfill script for existing epics. Includes 26 Cucumber integration test scenarios.

## Features

- feat(commit-issue-refs): add commit-issue-ref module with pure functions
- feat(commit-issue-refs): integrate post-sync commit issue ref amend into pipeline runner
- feat(compare-url): add compareUrl to gitMetadata type and render in epic body
- feat(compare-url): generate compare URL in resolveGitMetadata with active/archive strategy
- feat(compare-urls): add buildCompareUrl helper and wire into resolveGitMetadata
- feat(compare-urls): add compareUrl field to gitMetadata and render in epic body
- feat(early-issue-creation): add ensureEarlyIssues module with tests
- feat(early-issue-creation): integrate pre-dispatch issue creation into pipeline runner
- feat(backfill-script): add backfill-enrichment script with tests
- feat(enrichment-pipeline-fix): add artifacts field to EpicEvent and accumulate action
- feat(enrichment-pipeline-fix): wire artifact paths through reconcile functions
- feat(integration-tests): add GitHubEnrichmentWorld and hooks
- feat(integration-tests): add 7 .feature files with 26 scenarios
- feat(integration-tests): add step definitions for all 26 scenarios
- feat(integration-tests): add cucumber profile for github-enrichment

## Fixes

- fix(compare-url): remove duplicate code from rebase conflict resolution
- fix(early-issue-creation): remove duplicate import and test block from rebase
- fix(backfill-script): move script under src/ for rootDir compatibility
- fix(enrichment-pipeline-fix): pass projectRoot to syncGitHub on manual CLI path

## Chores

- refactor(enrichment-pipeline-fix): delete dead enrich() function and its tests

## Full Changelog

32 commits: `b9f7a48..d1d4468`
