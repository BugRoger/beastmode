---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: enrichment-data-pipeline
wave: 2
---

# Enrichment Data Pipeline

**Design:** `.beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md`

## User Stories

1. As a project observer, I want the epic issue to show the PRD summary (problem, solution, user stories, decisions), so that I understand what the epic is about without leaving GitHub.
2. As a project observer, I want the feature issue to show its description and user story, so that I understand what each feature delivers.

## What to Build

Fix the broken enrichment data pipeline so PRD content flows from design artifacts into GitHub issue bodies. Three root causes must be addressed:

**1. Artifact path propagation:** The reconcile functions must extract artifact paths from phase output and include them in state machine events. The `EpicEvent` types need an `artifacts` field so the state machine can store artifact paths in the manifest context. The `enrich()` function in the pure module needs review — if it's dead code disconnected from the actual flow, delete it and rewrite the artifact accumulation logic in the state machine actions.

**2. projectRoot plumbing:** The pipeline runner calls `syncGitHub()` without `projectRoot` on the manual CLI path. Without it, `readPrdSections()` (which resolves artifact paths relative to the project root) always returns undefined. Fix the runner to pass `projectRoot` through to the sync engine.

**3. Body formatter enhancement:**
- `formatEpicBody()` must render PRD sections: problem statement, solution, user stories, and decisions. These are extracted from the design artifact via the existing `extractSections()` helper. Also render the phase badge, artifact permalink table, and feature checklist.
- `formatFeatureBody()` must render the feature's description and user story from the plan artifact, plus a back-reference to the parent epic issue.

The body formatting functions remain pure (no I/O). Input types (`EpicBodyInput`, `FeatureBodyInput`) may need additional fields to carry the enrichment data. SHA256 body hashing ensures only changed bodies trigger GitHub edits.

Unit tests for the enhanced body formatters and the fixed artifact flow. Follow existing test patterns in the github sync and manifest pure test suites.

## Acceptance Criteria

- [ ] Artifact paths flow from phase output through reconcile → state machine → manifest
- [ ] `projectRoot` is passed to `syncGitHub()` on all code paths (manual CLI and pipeline)
- [ ] `formatEpicBody()` renders problem, solution, user stories, and decisions from the design artifact
- [ ] `formatEpicBody()` renders phase badge, artifact permalink table, and feature checklist
- [ ] `formatFeatureBody()` renders description, user story, and epic back-reference
- [ ] Dead `enrich()` code cleaned up or integrated into the actual flow
- [ ] Body hashing prevents redundant GitHub edits
- [ ] Unit tests pass for all enhanced body formatters
- [ ] Unit tests pass for artifact path propagation
