---
phase: release
epic-id: bm-c861
epic-slug: github-sync-bug-fixes-c861
bump: minor
---

# Release: github-sync-bug-fixes-c861

**Bump:** minor
**Date:** 2026-04-12

## Highlights

Cleans up three visible defects in GitHub issue sync: removes redundant phase badges from issue bodies, ensures artifact links use normalized repo-relative paths for GitHub permalink resolution, and adds diagnostic logging to the previously silent commit-issue-ref amend pipeline.

## Features

- Remove phase badge from `formatEpicBody` output — labels are the canonical phase indicator
- Remove phase badge from early issue stub body
- Add diagnostic logging to `amendCommitsInRange` and `resolveRangeStart` with debug messages at all silent exit points
- Log commit-ref amend result unconditionally in runner step 8.5

## Fixes

- Normalize artifact link paths through `buildArtifactsMap` to strip absolute/worktree-relative prefixes
- Strengthen slug-title BDD step assertion and remove dead import
- Rename misleading slug-title step to match actual assertion

## Full Changelog

- `12645fd2` feat(github-sync): remove phase badge from formatEpicBody
- `48869421` feat(github-sync): remove phase badge from early issue stub
- `61b1af2d` feat(fix-commit-issue-refs-c861.2): add diagnostic logging to amend pipeline
- `7d867c83` feat(fix-commit-issue-refs-c861.2): log commit-ref amend result unconditionally in runner
- `88b1897e` test(github-sync): invert phase badge assertion in sync engine test
- `d4b6c8cb` test(github-sync): invert phase badge assertion in body-enrichment test
- `b53616de` test(github-sync): update BDD scenarios to assert phase badge absence
- `b775221b` fix(bdd): strengthen slug-title step assertion, remove dead import
- `63a7459d` fix(bdd): rename misleading slug-title step to match actual assertion
- `d2f78297` test(github-sync): fix phase badge assertion in sync-separation test
- `53daef7c` test(fix-artifact-links-c861.3): add unit tests for artifact link path normalization pipeline
- `0c1fb70f` implement(github-sync-bug-fixes-c861--remove-phase-badge-c861.1): checkpoint
- `c0dc6135` implement(github-sync-bug-fixes-c861--fix-commit-issue-refs-c861.2): checkpoint
- `406e453d` implement(github-sync-bug-fixes-c861--fix-artifact-links-c861.3): checkpoint
- `730bae21` validate(github-sync-bug-fixes-c861): checkpoint (#542)
- `f4580c53` plan(github-sync-bug-fixes-c861): checkpoint (#542)
- `bfc1f8ee` design(frozen-gadget-c861): checkpoint
