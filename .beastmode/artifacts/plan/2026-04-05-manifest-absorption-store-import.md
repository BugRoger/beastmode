---
phase: plan
slug: 1f6b
epic: manifest-absorption
feature: store-import
wave: 1
---

# Store Import

**Design:** `.beastmode/artifacts/design/2026-04-04-1f6b.md`

## User Stories

1. As a **developer**, I want `beastmode store import` to migrate all existing manifests into the store, so that I can transition without losing pipeline state.

## What to Build

Create a self-contained migration command that converts `.manifest.json` files into store entities:

- **Command registration**: Add `beastmode store import` subcommand to the CLI command router.

- **Manifest reading (inlined)**: The import command inlines all manifest-reading code — it does NOT import from `manifest/store.ts` or `manifest/pure.ts`. This ensures the manifest module can be fully deleted in a later feature while import remains functional. Parse `.beastmode/state/*.manifest.json` files directly using the known JSON schema.

- **Epic entity creation**: For each manifest, generate a new `bm-xxxx` ID, create an epic entity with fields mapped from the manifest: `slug` (from `manifest.epic` slugified, or `manifest.slug`), `name` (from `manifest.epic` or derived from slug), `status` (from `manifest.phase`), `summary`, `worktree`, artifact paths.

- **Feature entity creation**: For each `manifest.features[]` entry, create a feature entity with `slug` (from feature slug), `name`, `description`, `status`, `plan` reference.

- **Wave-to-dependency conversion**: Convert `feature.wave` ordering into `depends_on` relationships. Features in wave N+1 depend on all features in wave N within the same epic. This is conservative — manual refinement via `--add-dep` / `--rm-dep` can tighten later.

- **GitHub ref extraction**: Extract `manifest.github` and `feature.github` refs into `github-sync.json` (schema: `Record<entityId, { issue: number; bodyHash?: string }>`). The GitHub sync module is the sole reader/writer of this file.

- **Grandfathering**: Existing branches, tags, and worktrees keep their current slug-based names. Only new epics created after migration use ID-based git artifact naming. The store entity's `worktree` field tracks actual paths regardless of naming convention.

- **Idempotency**: Running import twice on the same manifests produces the same store state — existing entities with matching origin are skipped.

- **Cleanup**: Delete `.manifest.json` files on successful import.

- **Validation**: After import, verify all entities created, all references resolve, no orphan features.

## Integration Test Scenarios

```gherkin
@manifest-absorption
Feature: Store import migrates manifests into the store

  The import command reads existing manifest files and creates
  store entities preserving all pipeline state. After successful
  import, manifest files are removed. The command is self-contained
  and idempotent.

  Background:
    Given a store is initialized

  Scenario: Import creates epic entity from manifest
    Given a manifest file exists for epic "auth-system" at phase "implement"
    When the store import command runs
    Then an epic entity "auth-system" exists in the store
    And the epic phase matches the manifest phase
    And the epic has a generated hash-based ID

  Scenario: Import creates feature entities from manifest features
    Given a manifest file exists with features "login-flow" and "token-cache"
    When the store import command runs
    Then feature entities exist in the store for "login-flow" and "token-cache"
    And each feature has a slug matching its original name

  Scenario: Import converts wave ordering to dependency relationships
    Given a manifest file exists with features across two waves
    And wave 1 has "auth-provider" and wave 2 has "token-cache"
    When the store import command runs
    Then "token-cache" depends on "auth-provider" in the store

  Scenario: Import extracts GitHub refs into the sync file
    Given a manifest file exists with GitHub issue numbers for epic and features
    When the store import command runs
    Then the issue numbers appear in the sync file
    And the store entities do not carry GitHub issue numbers

  Scenario: Import preserves artifact references
    Given a manifest file exists with design and plan artifact references
    When the store import command runs
    Then the epic entity has design and plan artifact fields populated

  Scenario: Import deletes manifest files on success
    Given a manifest file exists for epic "auth-system"
    When the store import command runs successfully
    Then the manifest file for "auth-system" no longer exists

  Scenario: Import is idempotent
    Given a manifest file has already been imported into the store
    When the store import command runs again on the same manifest
    Then no duplicate entities are created
    And the existing store state is unchanged

  Scenario: Import handles multiple manifests
    Given manifest files exist for "auth-system" and "data-pipeline"
    When the store import command runs
    Then both epics exist in the store with all their features
    And both manifest files are deleted

  Scenario: Import grandfathers active epic git artifacts
    Given an active epic has a slug-based branch and worktree
    When the store import command runs
    Then the store entity records the existing branch and worktree paths
    And no git artifacts are renamed to ID-based naming
```

## Acceptance Criteria

- [ ] `beastmode store import` command registered and callable
- [ ] Manifest JSON parsed inline — no imports from `manifest/` module
- [ ] Epic entities created with correct field mapping from manifests
- [ ] Feature entities created with slug field populated
- [ ] Wave ordering converted to `depends_on` relationships
- [ ] GitHub refs extracted to `github-sync.json`
- [ ] Existing git artifacts (branches, tags, worktrees) grandfathered
- [ ] Import is idempotent — re-running skips already-imported manifests
- [ ] Manifest files deleted on successful import
- [ ] Validation step confirms all entities and references resolve
