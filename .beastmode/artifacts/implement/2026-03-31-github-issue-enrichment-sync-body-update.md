---
phase: implement
epic: github-issue-enrichment
feature: sync-body-update
status: completed
---

# Implementation Deviations: sync-body-update

**Date:** 2026-03-31
**Feature Plan:** .beastmode/artifacts/plan/2026-03-31-github-issue-enrichment-sync-body-update.md
**Tasks completed:** 2/2
**Deviations:** 0

No deviations — plan executed exactly as written.

## Notes

Most of the sync-body-update feature was already implemented in prior features (body-formatting, manifest-summary). This feature wired the remaining pieces:

1. **post-dispatch.ts**: Applied sync mutations (setEpic, setFeatureIssue, setEpicBodyHash, setFeatureBodyHash) back to the manifest after syncGitHub returns. Previously mutations were returned but never persisted.

2. **github-sync.test.ts**: Added 8 tests covering body hash compare (skip/update), creation body with hash, and failure warnings for both epic and feature paths. Also added missing ghProjectItemDelete mock.
