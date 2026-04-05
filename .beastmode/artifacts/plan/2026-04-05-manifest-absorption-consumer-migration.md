---
phase: plan
slug: 1f6b
epic: manifest-absorption
feature: consumer-migration
wave: 3
---

# Consumer Migration

**Design:** `.beastmode/artifacts/design/2026-04-04-1f6b.md`

## User Stories

1. As a **watch loop**, I want to scan store entities and derive dispatch decisions from XState machine snapshots, so that epic discovery is a single JSON parse with machine-derived next actions.

2. As a **dashboard**, I want to render epic and feature state from store entities with XState-derived enrichment, so that the TUI shows the same data as `beastmode store` commands.

## What to Build

Migrate all remaining manifest consumers to read from the store and XState machine snapshots:

- **Watch loop rewrite (`commands/watch-loop.ts`)**: Replace `scanEpics()` (which calls `listEnriched()` on manifests) with a store-based scan:
  1. `store.listEpics()` — get all epics from store
  2. For each epic, hydrate XState machine snapshot from stored state
  3. Derive `nextAction` from machine snapshot metadata
  4. Return `EnrichedEpic[]` (from store-schema-extension feature)

  The watch loop's `WatchDeps.scanEpics` signature changes to return `EnrichedEpic[]` instead of `EnrichedManifest[]`.

- **Dashboard command rewrite (`commands/dashboard.ts`)**: Replace `listEnriched()` import with store-based scan. The dashboard renders from `EnrichedEpic[]` instead of `EnrichedManifest[]`.

- **Phase command rewrite (`commands/phase.ts`)**: Remove the manifest fallback path — use `store.find()` exclusively for epic resolution. Remove manifest seeding for design phase — create store entity instead.

- **Cancel logic rewrite (`commands/cancel-logic.ts`)**: Replace manifest deletion with store entity deletion (`store.deleteEpic()`). Also delete associated features. Also delete GitHub sync refs from `github-sync.json`.

- **Dispatch types rewrite (`dispatch/types.ts`)**: Replace re-exports of `EnrichedManifest`, `ScanResult`, `NextAction` from manifest/store with imports from store module. Use `EnrichedEpic` type.

- **iTerm2 dispatch rewrite (`dispatch/it2.ts`)**: Replace manifest store imports with store module imports. Update session creation to work with store entities.

- **Dashboard panels rewrite**: Update `dashboard/overview-panel.ts` to accept `EnrichedEpic[]`. Update `dashboard/App.tsx` and `dashboard/EpicsPanel.tsx` to render store entities.

- **Backfill script**: Update or delete `scripts/backfill-enrichment.ts` — it reads manifests for GitHub body enrichment. Either rewrite to read store entities + sync file, or delete if no longer needed post-migration.

## Integration Test Scenarios

```gherkin
@manifest-absorption
Feature: Watch loop and dashboard consume store entities

  The watch loop scans store entities and derives dispatch decisions
  from XState machine snapshots. The dashboard renders epic and
  feature state from store entities with XState-derived enrichment.
  Both consumers read the same data that store commands display.

  Background:
    Given a store is initialized

  Scenario: Watch loop discovers epics by scanning the store
    Given an epic "auth-system" exists in the store at phase "plan"
    And an epic "data-pipeline" exists in the store at phase "implement"
    When the watch loop scans for dispatchable work
    Then it finds both epics from the store
    And each epic has a machine-derived next action

  Scenario: Watch loop derives dispatch decisions from machine snapshots
    Given an epic "auth-system" exists at phase "implement"
    And feature "login-flow" has status "completed"
    And feature "token-cache" has status "pending" and depends on "login-flow"
    When the watch loop evaluates dispatch readiness
    Then "token-cache" is identified as ready for dispatch
    And the dispatch decision comes from the XState machine snapshot

  Scenario: Watch loop scan is a single store parse
    Given multiple epics exist in the store with various phases
    When the watch loop performs a scan
    Then all epic discovery happens from a single store read
    And no manifest files are consulted

  Scenario: Dashboard renders epic state from store entities
    Given an epic "auth-system" exists in the store at phase "implement"
    And features exist with mixed completion status
    When the dashboard renders the epic list
    Then it displays the epic phase from the store entity
    And it displays each feature with its store-derived status

  Scenario: Dashboard shows XState-derived enrichment
    Given an epic "auth-system" exists in the store at phase "implement"
    And the machine snapshot indicates the next action is feature dispatch
    When the dashboard renders the epic detail
    Then it shows the machine-derived next action
    And the displayed data matches what store commands would return

  Scenario: Dashboard and store commands show consistent data
    Given an epic "auth-system" exists in the store with three features
    When a developer views the dashboard
    And the developer runs a store tree command
    Then both views show the same epic phase and feature statuses
```

## Acceptance Criteria

- [ ] Watch loop scans store entities instead of manifests
- [ ] Watch loop derives `nextAction` from XState machine snapshots
- [ ] Dashboard renders from `EnrichedEpic[]` (store entities)
- [ ] Phase command uses `store.find()` exclusively — no manifest fallback
- [ ] Design phase creates store entity instead of seeding manifest
- [ ] Cancel logic deletes store entities and sync refs
- [ ] Dispatch types re-export from store module
- [ ] iTerm2 dispatch uses store entities
- [ ] Dashboard panels accept store entity types
- [ ] Backfill script updated or deleted
- [ ] All consumer tests updated for store types
- [ ] No production file imports from `manifest/` module
