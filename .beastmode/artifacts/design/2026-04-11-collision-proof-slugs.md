---
phase: design
slug: collision-proof-slugs
epic: collision-proof-slugs
---

## Problem Statement

Epic slugs derived from human-readable names collide silently. The deduplication mechanism (`deduplicateSlug()`) only protects features, never epics. `reconcileDesign()` deletes the old entity and creates a new one without checking if the target slug already exists, enabling one epic to overwrite another.

## Solution

Embed the entity's short ID into the slug itself, making collisions structurally impossible. The slug becomes the single collision-proof external key everywhere.

- Epic slug: `{slugified-name}-{shortId}` where shortId is the 4 hex chars from the entity ID (e.g., `dashboard-redesign-f3a7`)
- Feature slug: `{slugified-name}-{ordinal}` where ordinal is the sequential number from the feature ID suffix (e.g., `auth-flow-1`)
- Design-phase initial slug: `{shortId}` only (e.g., `f3a7`) — renamed to full form after design agent picks a name

The short ID is generated collision-free by `generateEpicId()` which loops until unique. Embedding it in the slug inherits that uniqueness guarantee. `deduplicateSlug()` becomes dead code.

## User Stories

1. As a pipeline operator, I want epic slugs to be structurally unique, so that two epics with similar names never overwrite each other in the store.
2. As a CLI user, I want to type `beastmode plan dashboard-redesign` and have it resolve to `dashboard-redesign-f3a7` via prefix matching, so that I don't need to remember the hex suffix.
3. As the design phase, I want `reconcileDesign()` to update the slug in-place via `updateEpic()` instead of delete/recreate, so that the entity ID remains stable throughout the epic lifecycle.
4. As the pipeline, I want feature slugs to include their ordinal suffix (e.g., `auth-flow-1`), so that features within the same epic are uniquely addressable without hash-based deduplication.
5. As the artifact reader, I want `filenameMatchesEpic()` to still correctly match feature-level files using `startsWith(epicSlug + "-")`, so that the hex suffix in the epic slug doesn't break boundary detection.
6. As a user with active epics, I want old-format slugs to keep working without migration, so that in-progress work isn't disrupted by the upgrade.
7. As a developer, I want `deduplicateSlug()`, `hashId()`, and `collectSlugs()` deleted, so that the dead code doesn't mislead future contributors.
8. As the CLI resolver, I want prefix matching to only exist at the CLI entry point (`resolveIdentifier()` with opt-in flag), so that internal callers retain exact-match semantics and avoid accidental ambiguous resolution.

## Implementation Decisions

- Slug is always computed, never user-provided. The `slug?` optional parameter is removed from both `addEpic()` and `addFeature()`. Slugs are derived: `slugify(name) + "-" + shortId` for epics, `slugify(name) + "-" + ordinal` for features.
- `reconcileDesign()` switches from delete/recreate to in-place `updateEpic()` with slug change. Entity ID (`bm-XXXX`) is stable for the full lifecycle. `EpicPatch` already allows slug writes — no type change needed.
- Prefix matching is CLI-only. `resolveIdentifier()` gains an opt-in flag (e.g., `{ allowPrefix: true }`). Only `phaseCommand()` and `cancelCommand()` pass it. Internal callers (reconcile, scan, fan-out) keep exact match via `store.find()`.
- Resolution chain for CLI: (1) exact ID match, (2) exact slug match, (3) prefix slug match. Ambiguous prefix matches return an error requiring more specificity. Prefix match is safe because the ID suffix is random — a human-readable prefix can only match one entity.
- Git tags (`beastmode/<slug>/<phase>`) rename at reconcile, same as today. Design creates `beastmode/f3a7/design`, reconcile renames to `beastmode/dashboard-redesign-f3a7/design`.
- `filenameMatchesEpic()` keeps the `hexSlug?` parameter for matching design-phase artifact filenames (e.g., `YYYY-MM-DD-f3a7.output.json`) after the epic slug has been renamed.
- Dead code deletion: `deduplicateSlug()`, `hashId()`, and `collectSlugs()` are removed from `slug.ts`. No deprecation period — structurally unreachable after this change.
- `addEpic()` slug derivation replaces the current `name.toLowerCase().replace(/\s+/g, "-")` fallback with `slugify(name)` + ID suffix. Uses the proper `slugify()` function instead of the inline lowercasing.
- Feature ordinal collisions (e.g., feature named "auth flow 1" producing `auth-flow-1-1`) are accepted — ugly but unambiguous.

## Testing Decisions

- Unit tests for new slug derivation in `addEpic()` and `addFeature()` — verify the ID/ordinal suffix is always appended.
- Unit tests for `resolveIdentifier()` with `allowPrefix: true` — verify exact match takes priority, prefix match works, ambiguous prefix errors.
- Unit tests for `reconcileDesign()` in-place update — verify entity ID stability, slug mutation, and git tag rename.
- Integration test: full design-to-plan cycle with new slug format — verify artifact filenames, plan frontmatter, and fan-out matching all use the new slug.
- Regression test: verify `filenameMatchesEpic()` still correctly distinguishes epic-level from feature-level files with the new slug format.
- Prior art: existing tests in `cli/src/store/` and `cli/src/pipeline/` test suites.

## Out of Scope

- Migration of existing epics — old epics keep old-format slugs and work unchanged. New epics get new format.
- Worktree or branch rename for in-progress epics — old worktrees continue with existing slugs.
- Changes to `isValidSlug()` regex — the new format already passes validation.
- Any user-facing slug override capability — slugs are always derived.

## Further Notes

- The no-migration strategy (option 3) means the codebase will have mixed slug formats until all pre-upgrade epics complete. This is acceptable because epics are short-lived and the pipeline passes slug strings through without format enforcement.
- Plan file frontmatter (`epic:` field) is matched per-epic, and the slug doesn't change mid-pipeline (except during design), so no plan file migration is needed.

## Deferred Ideas

None
