---
phase: plan
epic: github-issue-enrichment
feature: manifest-summary
---

# Manifest Summary Fields

**Design:** `.beastmode/artifacts/design/2026-03-31-github-issue-enrichment.md`

## User Stories

1. As a stakeholder viewing the project board, I want epic issues to describe the problem being solved and the approach, so that I can understand work-in-progress without reading local files.
2. As a developer picking up a feature, I want the feature issue to contain the plan description and user stories, so that I can understand the scope from GitHub alone.
4. As a developer, I want issue descriptions to stay current as the epic progresses through phases, so that GitHub issues are living documentation.

## What to Build

Add two additive fields to the manifest type system:

**Epic summary:** A `summary` field on `PipelineManifest` containing `{ problem: string; solution: string }`. This is populated by the design checkpoint phase output. The pipeline machine's `DESIGN_COMPLETED` event handler and enrichment logic must propagate the summary from the phase output into the manifest context.

**Feature description:** A `description` field on `ManifestFeature`. This is populated by the plan checkpoint phase output. The `PLAN_COMPLETED` event handler's feature-setting logic must carry the description from the phase output's feature array into each manifest feature entry.

Both fields are optional at the type level — existing manifests without them remain valid. The phase output types must also be extended to carry these fields from the skill checkpoint output through to the manifest enrichment pipeline.

## Acceptance Criteria

- [ ] `PipelineManifest` type has optional `summary?: { problem: string; solution: string }` field
- [ ] `ManifestFeature` type has optional `description?: string` field
- [ ] Design phase output can carry `summary` through the enrichment pipeline to the manifest
- [ ] Plan phase output can carry `description` per feature through to manifest features
- [ ] Existing manifests without these fields still validate correctly
- [ ] Tests cover enrichment with and without summary/description fields
