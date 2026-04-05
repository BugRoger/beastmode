---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: enrichment-pipeline-fix
wave: 2
---

# Enrichment Pipeline Fix

**Design:** .beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md

## User Stories

1. As a project observer, I want the epic issue to show the PRD summary (problem, solution, user stories, decisions), so that I understand what the epic is about without leaving GitHub.
2. As a project observer, I want the feature issue to show its description and user story, so that I understand what each feature delivers.

## What to Build

Fix the three root causes that break the enrichment data pipeline:

**Root cause 1: Dead `enrich()` function.** The `enrich()` function in the manifest pure module is defined and exported but never called. The reconcile step must call it (or inline its logic) so that artifact paths from phase output flow into the manifest's `artifacts` record. Without this, `readPrdSections()` has no artifact path to resolve.

**Root cause 2: Missing artifact paths in state machine events.** The pipeline machine event types lack an `artifacts` field. Reconcile functions that produce state machine events from phase output cannot forward artifact paths. The event types need an artifacts field, and the reconcile logic must populate it from `output.artifacts`.

**Root cause 3: `projectRoot` not passed on manual CLI path.** The pipeline runner calls `syncGitHub()` without passing `projectRoot` on the manual CLI path. This means `readPrdSections()` can never resolve the design artifact file. The runner must pass `projectRoot` (the worktree path) in the sync options.

**Feature body enrichment.** The feature body formatting function needs access to the feature's description and user story from the plan artifact. The sync engine should extract per-feature content from plan artifacts and pass it to `formatFeatureBody()`.

All fixes are internal plumbing — no new public interfaces. The existing `formatEpicBody()` and `formatFeatureBody()` pure functions already accept the right input shapes; the problem is that the data never reaches them.

## Acceptance Criteria

- [ ] `readPrdSections()` returns PRD sections (problem, solution, user stories, decisions) when called with a manifest that has design artifacts
- [ ] Epic issue body contains all four PRD sections after design phase sync
- [ ] Feature issue body contains description and user story after plan phase sync
- [ ] `projectRoot` is passed to `syncGitHub()` on both manual CLI and watch loop paths
- [ ] The dead `enrich()` function is either called or its logic is integrated into the reconcile step
- [ ] Pipeline machine event types carry artifact paths through state transitions
- [ ] Existing sync engine tests continue to pass
- [ ] New unit tests verify `formatEpicBody()` renders PRD sections and `formatFeatureBody()` renders description + user story
