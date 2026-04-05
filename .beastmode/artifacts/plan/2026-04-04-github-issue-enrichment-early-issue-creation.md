---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: early-issue-creation
wave: 3
---

# Early Issue Creation

**Design:** .beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md

## User Stories

6. As a pipeline operator, I want GitHub issues created at phase start (pre-dispatch) rather than at checkpoint, so that issue numbers are available for commit references from the first commit.

## What to Build

Add a pre-dispatch step to the pipeline runner that ensures GitHub issues exist before the skill dispatch runs. Currently, issues are created during the post-dispatch sync step — too late for commit references.

**Epic issue stub creation.** Before the design phase dispatch, the pipeline runner checks if the manifest has a GitHub epic issue number. If not, it creates a minimal stub issue (slug as title, `phase/design` label, `type/epic` label, minimal body "Pending enrichment"). The issue number is written to the manifest immediately so it's available throughout the phase.

**Feature issue stub creation.** Before the implement phase dispatch, the pipeline runner checks each feature for a GitHub issue number. Features without issues get stubs created (feature slug as title, `type/feature` label, `status/ready` label, minimal body with epic back-reference). Issue numbers are written to the manifest before dispatch.

**Idempotency.** If the manifest already has an issue number for the epic or feature, skip creation. This handles re-runs and regressions gracefully.

**Integration with existing sync.** The post-dispatch sync step must not create duplicate issues. The sync engine already checks `manifest.github.epic` and `feature.github.issue` before creating — the pre-dispatch step simply populates these fields earlier.

This is a pipeline runner change, not a sync engine change. The sync engine's issue creation logic stays as-is for the body enrichment step. The pre-dispatch step only creates stubs.

## Acceptance Criteria

- [ ] Epic GitHub issue exists in the manifest before design phase skill dispatch begins
- [ ] Feature GitHub issues exist in the manifest before implement phase skill dispatch begins
- [ ] Pre-dispatch created issues are minimal stubs (slug title, type label, phase/status label)
- [ ] Pre-dispatch step is idempotent — no duplicate issues on re-runs
- [ ] Post-dispatch sync enriches stub issues with full body content (no conflicts)
- [ ] Manifest is persisted after pre-dispatch issue creation (survives skill crashes)
- [ ] Warn-and-continue: GitHub API failure in pre-dispatch does not block skill dispatch
- [ ] Unit tests verify stub creation, idempotency, and error handling
