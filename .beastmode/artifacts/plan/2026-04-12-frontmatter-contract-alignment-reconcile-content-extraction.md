---
phase: plan
slug: quick-quartz-96da
epic: frontmatter-contract-alignment
feature: reconcile-content-extraction
wave: 2
---

# reconcile-content-extraction

**Design:** `.beastmode/artifacts/design/2026-04-12-quick-quartz-96da.md`

## User Stories

3. As the reconcile step, I want to read content (problem, solution, description) directly from artifact markdown body sections instead of output.json, so that output.json carries only decisions and status.
4. As the reconcile step during design, I want to compare `epic-slug` from output.json against the store's current slug and trigger a rename when they differ, so that the skill's proposed epic name flows into the store through a single rename path.
6. As the test suite, I want test fixtures updated to use the aligned field names, so that tests validate the documented contract.

## What to Build

### Reconcile Design Phase Changes

The `reconcileDesign` function currently reads `artifacts.slug` and `artifacts.summary` from output.json. After wave 1, output.json will have:
- `epic-slug` instead of `slug` (no `epic` field)
- No `summary` object

Update `reconcileDesign` to:
1. Read `epic-slug` from `artifacts['epic-slug']` instead of `artifacts.slug`
2. Extract `## Problem Statement` and `## Solution` sections from the design artifact markdown body using the existing `extractSection` utility from `reader.ts`
3. Concatenate problem and solution into `epic.summary` (format: `{problem} — {solution}`)
4. The slug rename logic (`realSlug` comparison) stays the same, just uses the new field name

### Reconcile Plan Phase Changes

The `reconcilePlan` function currently reads `features[].description` from output.json. After wave 1, plan features in output.json will have:
- `feature-slug` instead of `slug`
- No `description` field

Update `reconcilePlan` to:
1. Read `feature-slug` instead of `slug` from each feature entry
2. Extract content from the plan artifact markdown body for feature description. Read the plan artifact file referenced by `feature.plan` and extract the `## What to Build` section (or `## Description` if present) using `extractSection`
3. Pass extracted description to `store.addFeature()` / `store.updateFeature()`

### Reconcile Validate Phase Changes

Update `reconcileValidate` to read `failed-features` instead of `failedFeatures` from output.json artifacts.

### BDD World Artifact Writers

Update all artifact writer methods in `world.ts` to use the new frontmatter field names:
- `writeDesignArtifact`: use `epic-id` and `epic-slug` instead of `slug` and `epic`, no `problem`/`solution` in frontmatter
- `writePlanArtifacts`: use `epic-id`, `epic-slug`, `feature-slug` instead of `slug`, `epic`, `feature`, no `description` in frontmatter
- `writeImplementArtifact`: use `epic-id`, `epic-slug`, `feature-slug` instead of `slug`, `epic`, `feature`
- `writeValidateArtifact`: use `epic-id`, `epic-slug` instead of `slug`, `epic`
- `writeValidateArtifactWithFailures`: use `epic-id`, `epic-slug`, `failed-features` instead of `slug`, `epic`, `failedFeatures`
- `writeReleaseArtifact`: use `epic-id`, `epic-slug` instead of `slug`, `epic`

### Content in Artifact Body

The design artifact writers should include `## Problem Statement` and `## Solution` sections in the markdown body (they may already do this as part of the PRD template). The plan artifact writers should include a `## What to Build` or `## Description` section. Verify and update if needed so reconcile has content to extract.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] `reconcileDesign` reads `epic-slug` from output.json instead of `slug`
- [ ] `reconcileDesign` extracts problem/solution from design artifact body using `extractSection`, not from output.json summary
- [ ] `reconcileDesign` still correctly detects slug renames and triggers the rename path
- [ ] `reconcilePlan` reads `feature-slug` from output.json instead of `slug`
- [ ] `reconcilePlan` extracts feature description from plan artifact body, not from output.json
- [ ] `reconcileValidate` reads `failed-features` from output.json instead of `failedFeatures`
- [ ] All BDD world artifact writers use the new field names
- [ ] BDD integration tests pass end-to-end with the new field names
- [ ] Store entities (epic.summary, feature.description) are populated correctly from artifact body content
