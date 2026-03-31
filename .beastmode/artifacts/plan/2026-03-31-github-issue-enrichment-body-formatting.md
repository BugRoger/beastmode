---
phase: plan
epic: github-issue-enrichment
feature: body-formatting
---

# Body Formatting

**Design:** `.beastmode/artifacts/design/2026-03-31-github-issue-enrichment.md`

## User Stories

1. As a stakeholder viewing the project board, I want epic issues to describe the problem being solved and the approach, so that I can understand work-in-progress without reading local files.
2. As a developer picking up a feature, I want the feature issue to contain the plan description and user stories, so that I can understand the scope from GitHub alone.
3. As a pipeline operator, I want epic issue bodies to include a feature checklist with completion status, so that the epic issue serves as a progress dashboard.

## What to Build

A pure formatting module that renders GitHub issue body markdown from manifest state. No I/O, no side effects — just data in, markdown out.

**Epic body formatter:** Takes a `PipelineManifest` and produces a markdown string. Includes a phase badge, problem statement (from `summary.problem`), solution summary (from `summary.solution`), and a feature checklist. The checklist iterates the manifest's feature array in order. Each entry shows a checkbox (checked if completed), the issue link (`#N`) if the feature has a github issue number or plain text if not yet linked, and the feature slug. Cancelled features are excluded. If summary fields are missing, the formatter still produces a useful fallback body: phase badge and feature checklist without the problem/solution sections.

**Feature body formatter:** Takes a `ManifestFeature` and an epic issue number, produces a markdown string. Includes the feature description (from `description` field) and an epic back-reference (`#N`). If description is missing, falls back to the current stub format.

Both formatters are stateless functions suitable for unit testing in isolation.

## Acceptance Criteria

- [ ] Epic body includes phase badge, problem statement, solution summary, and feature checklist
- [ ] Feature checklist shows `[x]` for completed features, `[ ]` for others
- [ ] Feature checklist items include `#N` link when issue exists, plain slug when not
- [ ] Cancelled features are excluded from the checklist
- [ ] Feature checklist follows manifest array order
- [ ] Feature body includes description text and epic back-reference
- [ ] Missing summary fields produce graceful fallback (phase badge + checklist, no blank sections)
- [ ] Missing feature description produces graceful fallback
- [ ] Formatters are pure functions with no I/O dependencies
- [ ] Tests cover: no features, partial completion, all done, missing summary, missing description, cancelled features, unlinked features
