---
phase: plan
slug: unified-hook-context
epic: unified-hook-context
feature: session-start-metadata
wave: 3
---

# session-start-metadata

**Design:** `.beastmode/artifacts/design/2026-04-11-unified-hook-context.md`

## User Stories

2. As a skill, I want a structured metadata section in the SessionStart additionalContext that includes phase, epic ID/slug, feature ID/slug, parent artifact paths, and my output target path, so that I never derive filenames or parse the slash command string.

## What to Build

**Structured metadata section:** Add a structured metadata block at the top of the `additionalContext` string produced by `assembleContext`. The block should be clearly delimited (e.g., a markdown section or fenced block) so skills can parse it reliably. It contains:

- `phase` — current phase name
- `epic-id` — store entity ID (e.g., `bm-f3a7`)
- `epic-slug` — collision-proof slug (e.g., `dashboard-redesign-f3a7`)
- `feature-id` — feature entity ID (implement phase only, e.g., `bm-f3a7.1`)
- `feature-slug` — feature slug (implement phase only, e.g., `auth-flow-1`)
- `parent-artifacts` — list of resolved parent artifact filenames for the current phase
- `output-target` — the full relative path where the skill should write its artifact (e.g., `.beastmode/artifacts/plan/2026-04-11-dashboard-redesign-f3a7-auth-flow-1.md`)

The metadata section is prepended before the existing context (L0, L1, artifacts, gates). The rest of additionalContext remains unchanged.

**Extend SessionStartInput:** Add `epicId` and `featureId` optional fields to the `SessionStartInput` interface. These are passed from the pipeline runner (which now has the entity ID from the pre-create-entity feature). The existing `epic`/`slug` fields are renamed to `epicSlug` for clarity (or kept with clear documentation).

**Output target computation:** The CLI computes the full artifact output path based on: date prefix (today's date), epic slug, feature slug (if applicable), and phase. Format: `.beastmode/artifacts/<phase>/YYYY-MM-DD-<epic-slug>[-<feature-slug>].md`. This eliminates filename derivation in skills.

**Update runner to pass entity IDs:** In the pipeline runner Step 3, the `writeSessionStartHook` call must include the entity ID (from pre-create-entity feature's work). The `SessionStartInput` and `buildSessionStartHook` interfaces receive the new fields.

**Parent artifact resolution:** The metadata section lists the filenames of resolved parent artifacts. These are already resolved by `resolveArtifacts` — the metadata section just needs to capture the filenames before the content is read. This may require a small refactor to `resolveArtifacts` to return paths alongside content.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Metadata section appears at top of additionalContext output
- [ ] Metadata contains phase, epic-id, epic-slug fields for all phases
- [ ] Metadata contains feature-id, feature-slug fields for implement phase
- [ ] Metadata contains parent-artifacts list (filenames of resolved parent artifacts)
- [ ] Metadata contains output-target path with correct date prefix and slug components
- [ ] `SessionStartInput` interface extended with `epicId` and `featureId` optional fields
- [ ] Pipeline runner passes entity IDs into hook context
- [ ] Rest of additionalContext (L0, L1, artifacts, gates) unchanged
- [ ] Output target path format matches: `.beastmode/artifacts/<phase>/YYYY-MM-DD-<epic-slug>[-<feature-slug>].md`
- [ ] Unit tests verify metadata section format and field values
- [ ] Unit tests verify output target path computation for each phase
- [ ] Unit tests verify metadata present alongside existing context sections
