# manifest-phase-field

**Design:** `.beastmode/state/design/2026-03-29-bulletproof-state-scanner.md`
**Architectural Decisions:** see manifest

## User Stories

1. As a pipeline operator, I want the state scanner to correctly identify epic phase from a single manifest field, so that phase derivation is deterministic and debuggable.

## What to Build

Add a top-level `phase` field to the manifest JSON schema with valid values: `plan`, `implement`, `validate`, `release`, `released`. This field becomes the single source of truth for epic phase — replacing both the phase marker files (`validate-<slug>`, `release-<slug>` in the pipeline directory) and the `phases` map that some manifests carry.

Update the reconciler's phase transition points to write `manifest.phase` instead of creating marker files:
- After plan populates features → set `phase: "implement"`
- When all features complete → set `phase: "validate"`
- After validate succeeds → set `phase: "release"`
- After release completes → set `phase: "released"`

Remove the `phases` map from the manifest structure. Remove marker file creation and reading logic from the reconciler. Migrate existing pipeline manifests by computing the correct `phase` value from their current derived state.

## Acceptance Criteria

- [ ] Manifest JSON schema includes a `phase` field with enum values `plan | implement | validate | release | released`
- [ ] `reconcilePlan()` sets `phase: "implement"` when populating features
- [ ] `markFeatureCompleted()` sets `phase: "validate"` when all features are completed
- [ ] Phase advancement through validate → release → released is driven by `manifest.phase`
- [ ] Phase marker files are no longer created or read
- [ ] The `phases` map is removed from the manifest structure
- [ ] Existing pipeline manifests are migrated to include `phase` based on current state
