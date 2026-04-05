---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: early-issue-creation
wave: 3
---

# Early Issue Creation

**Design:** `.beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md`

## User Stories

6. As a pipeline operator, I want GitHub issues created at phase start (pre-dispatch) rather than at checkpoint, so that issue numbers are available for commit references from the first commit.

## What to Build

Add a pre-dispatch step in the pipeline runner that ensures GitHub issues exist before the phase skill runs. Currently, issues are created at the post-dispatch sync step, which means issue numbers aren't available for commit references during the phase.

**Epic issue creation:** Before the design phase dispatch, create a minimal stub issue with the slug as title, a phase badge label, and a type label. Store the issue number in the manifest immediately so it's available to the skill session. The body is a minimal placeholder — full enrichment happens at the post-dispatch sync.

**Feature issue creation:** Before the implement phase dispatch, create stub issues for each feature defined in the manifest. Each feature gets a stub issue with its slug as title and the feature type label. Feature issue numbers are stored in the manifest features array.

**Idempotency:** If the manifest already has an issue number (epic or feature), skip creation. This handles re-runs and restarts gracefully.

**Phase gating:** Epic issue creation runs only before design phase. Feature issue creation runs only before implement phase. Other phases skip this step entirely.

Follow the warn-and-continue pattern — if issue creation fails, log a warning and proceed. The sync engine will create the issue at post-dispatch as a fallback.

## Acceptance Criteria

- [ ] Epic GitHub issue created before design phase dispatch begins
- [ ] Feature GitHub issues created before implement phase dispatch begins
- [ ] Issue numbers recorded in manifest before skill session starts
- [ ] Stub issues contain slug as title, phase badge, and type label
- [ ] Creation is idempotent — no duplicates on re-run
- [ ] Feature issue creation skipped for non-implement phases
- [ ] Warn-and-continue on GitHub API failure — never blocks dispatch
