---
phase: plan
slug: quick-quartz-96da
epic: quick-quartz-96da
feature: types-and-session-stop
wave: 1
---

# types-and-session-stop

**Design:** `.beastmode/artifacts/design/2026-04-12-quick-quartz-96da.md`

## User Stories

1. As a skill author, I want frontmatter field names to match the metadata-in field names, so that I copy names verbatim instead of translating between `epic-slug` and `epic`/`slug`/`id`.
2. As the session-stop hook, I want to pass frontmatter fields through to output.json without interpretation, so that session-stop remains a dumb translator with no business logic.
6. As the test suite, I want test fixtures updated to use the aligned field names, so that tests validate the documented contract.

## What to Build

### ArtifactFrontmatter Interface Rename

The `ArtifactFrontmatter` interface in session-stop currently uses old field names (`id`, `epic`, `feature`, `failedFeatures`, `description`, `problem`, `solution`). Rename to the unified naming convention:

- `id` → remove (was a legacy fallback; `epic-id` now explicit)
- `epic` → `epic-slug` (key name in the interface becomes a hyphenated string key)
- `feature` → `feature-slug`
- `failedFeatures` → `failed-features`
- `description` → remove from frontmatter (content lives in markdown body)
- `problem` → remove from frontmatter (content lives in markdown body)
- `solution` → remove from frontmatter (content lives in markdown body)

Add new field:
- `epic-id` (identity echo)
- `feature-id` (identity echo, implement phase only)

Since TypeScript interfaces can't have hyphenated keys as regular properties, use index signature or bracket notation in the interface. The `parseFrontmatter` function already returns a `Record<string, string>` cast to the interface, so hyphenated keys work naturally with bracket access.

### PhaseOutput Type Renames

Update the artifact type interfaces:

**DesignArtifacts:**
- `slug` field → `epic-slug` (the skill-proposed epic name)
- Remove `epic` field (redundant with `epic-slug`)
- Remove `summary` field (content extracted from artifact body by reconcile, not passed through output.json)

**PlanArtifacts:**
- `features[].slug` → `features[].feature-slug`
- Remove `features[].description` (content extracted from artifact body by reconcile)

**ValidateArtifacts:**
- `failedFeatures` → `failed-features`

### buildOutput Function

Update the `buildOutput` function to:
- Design case: output `epic-slug` instead of `slug`/`epic`, no `summary` object
- Plan case: `scanPlanFeatures` returns `feature-slug` instead of `slug`, no `description`
- Implement case: use `feature-slug` instead of `feature` from frontmatter
- Validate case: read `failed-features` instead of `failedFeatures` from frontmatter
- Release case: no field name changes needed (just `bump`)

### scanPlanFeatures Function

Update to:
- Match on `epic-slug` frontmatter field instead of `epic`
- Read `feature-slug` instead of `feature`
- Drop `description` from returned entries
- Read `wave` (unchanged)

### Unit Tests

Update all test fixtures in the session-stop test file to use the new field names. Tests should verify:
- `parseFrontmatter` handles hyphenated keys correctly
- `buildOutput` produces output with new field names
- Design output has no `summary` object
- Plan features have no `description`
- `scanPlanFeatures` matches on `epic-slug` field
- Validate output uses `failed-features` instead of `failedFeatures`

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] `ArtifactFrontmatter` interface uses `epic-id`, `epic-slug`, `feature-id`, `feature-slug`, `failed-features` field names
- [ ] `ArtifactFrontmatter` no longer includes `id`, `epic`, `feature`, `failedFeatures`, `description`, `problem`, `solution`
- [ ] `DesignArtifacts` type uses `epic-slug` instead of `slug`, has no `epic` or `summary` fields
- [ ] `PlanArtifacts` features use `feature-slug` instead of `slug`, have no `description`
- [ ] `ValidateArtifacts` uses `failed-features` instead of `failedFeatures`
- [ ] `buildOutput` produces output matching the new type shapes
- [ ] `scanPlanFeatures` matches on `epic-slug` frontmatter field
- [ ] All session-stop unit tests pass with new field names
- [ ] `session-start.test.ts` verified to already use correct field names (no changes needed)
