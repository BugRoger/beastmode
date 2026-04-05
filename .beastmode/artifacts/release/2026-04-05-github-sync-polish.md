---
phase: release
slug: github-sync-polish
epic: github-sync-polish
bump: minor
---

# Release: github-sync-polish

**Version:** v0.92.0
**Date:** 2026-04-05

## Highlights

Completes the GitHub sync polish epic: body enrichment for issues with full PRD/plan content, git push integration in the pipeline, branch linking via GraphQL, per-commit issue traceability with range-based amend, and a full reconciliation backfill command.

## Features

- feat(body-enrichment): expand epic body with full PRD, remove Git section
- feat(body-enrichment): expand feature body with full plan sections
- feat(body-enrichment): add title support to ghIssueEdit
- feat(body-enrichment): use human-readable names for issue titles
- feat(git-push): add push module with hasRemote, pushBranches, pushTags
- feat(git-push): integrate push step into pipeline runner
- feat(branch-linking): add ghRepoNodeId and ghIssueNodeId helpers
- feat(branch-linking): add ghCreateLinkedBranch GraphQL wrapper
- feat(branch-linking): add branch link orchestrator
- feat(branch-linking): add Step 8.9 to pipeline runner
- feat(commit-traceability): add resolveCommitIssueNumber for per-commit issue routing
- feat(commit-traceability): add resolveRangeStart and amendCommitsInRange
- feat(commit-traceability): wire range-based amend into pipeline runner step 8.5
- feat(backfill): add integration test skeleton for backfill scenarios
- feat(backfill): rewrite with full reconciliation (sync, push, amend, link)
- feat(backfill): comprehensive test suite for full reconciliation backfill

## Fixes

- fix(branch-linking): fix TS2769 typing in branch-link test

## Chores

- refactor(body-enrichment): remove dead resolveGitMetadata and readVersionTag
- test(body-enrichment): update github-sync test for Git section removal
- test(body-enrichment): add integration test
- test(git-push): add integration test
- test(branch-linking): add integration test
- validate(github-sync-polish): checkpoint
- implement checkpoints for all 5 features
- plan(github-sync-polish): checkpoint
- design(github-sync-polish): checkpoint (x2)

## Full Changelog

`main..feature/github-sync-polish` — 28 commits across 5 features (body-enrichment, git-push, branch-linking, commit-traceability, backfill)
