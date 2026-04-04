---
phase: plan
slug: structured-task-store
epic: structured-task-store
feature: store-backend
wave: 2
---

# Store Backend

**Design:** `.beastmode/artifacts/design/2026-04-04-structured-task-store.md`

## User Stories

2. As an **agent**, I want to create and update features with hash-based IDs via CLI commands, so that concurrent worktree agents never collide on entity identifiers.
3. As a **pipeline orchestrator**, I want cross-epic dependency modeling (`depends_on`), so that the watch loop can detect when epic B is blocked by epic A's incomplete features.
6. As a **pipeline orchestrator**, I want dependency-based ordering to replace static wave numbers, so that partial failures and re-planning don't require manual wave reassignment.
7. As a **developer**, I want typed artifact fields on entities (`design`, `plan`, `implement`, `validate`, `release`), so that artifact references are explicit per entity type rather than a generic phase-keyed record.
9. As a **developer**, I want a pluggable store backend interface, so that the JSON file backend can be swapped for git-synced JSON, SQLite, or Dolt in the future without changing the CLI or agent commands.

## What to Build

The deep module: a `TaskStore` interface and its `JsonFileStore` implementation that provides the structured persistence layer for epics and features.

**Type System:**
- `Epic` and `Feature` entity types with all fields from the PRD data model
- `EpicStatus` enum: design | plan | implement | validate | release | done | cancelled
- `FeatureStatus` enum: pending | in-progress | completed | blocked
- `EntityType` discriminated union
- `TreeNode` for hierarchy visualization
- `EpicPatch` and `FeaturePatch` for partial updates

**TaskStore Interface:**
- Epic CRUD: `getEpic`, `listEpics`, `addEpic`, `updateEpic`, `deleteEpic`
- Feature CRUD: `getFeature`, `listFeatures`, `addFeature`, `updateFeature`, `deleteFeature`
- Queries: `ready` (unblocked entities), `blocked` (status=blocked), `tree` (hierarchy), `find` (ID or slug lookup)
- Dependency graph: `dependencyChain` (transitive deps), `computeWave` (topological depth)
- Lifecycle: `load`, `save`

**JsonFileStore Implementation:**
- Backed by `.beastmode/state/store.json` (single file, gitignored)
- Version field for future schema migrations
- Flat entity map keyed by ID in the JSON structure
- ID generation: `bm-xxxx` (4 random hex, collision-checked) for epics, `bm-xxxx.n` (sequential ordinal) for features
- Concurrency: per-file async mutex following the same pattern as manifest `store.transact()`
- Ready-work computation: entities where all `depends_on` entries are done/completed and parent not blocked/cancelled
- Wave computation: topological depth in dependency graph (max transitive dep depth + 1)
- Cycle detection in dependency graph
- Parent-child relationship derived from dot-notation ID hierarchy

**Unit Tests:**
- CRUD operations for both entity types
- ID generation and collision detection
- Dependency graph traversal and cycle detection
- Ready-work computation with various dependency states
- Wave computation for linear chains, diamond graphs, disconnected subgraphs
- Find by ID, find by slug, ambiguous reference handling
- Load/save round-trip with file I/O
- Concurrent mutation serialization

## Acceptance Criteria

- [ ] `TaskStore` interface exported with all methods from the PRD
- [ ] `JsonFileStore` class implements `TaskStore` backed by `store.json`
- [ ] Epic CRUD: create with hash ID, read, update (partial patch), delete
- [ ] Feature CRUD: create with hierarchical ID (`bm-xxxx.n`), read, list by parent, update, delete
- [ ] ID collision detection on create (regenerate on collision)
- [ ] `depends_on` field stored on both entity types
- [ ] `dependencyChain(id)` returns transitive dependency closure
- [ ] `computeWave(id)` returns topological depth (1-indexed)
- [ ] Cycle detection throws descriptive error on circular `depends_on`
- [ ] `ready()` returns entities with all deps satisfied and parent not blocked
- [ ] `blocked()` returns entities with `status=blocked`
- [ ] `tree()` returns hierarchical `TreeNode[]` structure
- [ ] `find(idOrSlug)` resolves by exact ID match then slug match
- [ ] Typed artifact fields: `design`, `plan`, `implement`, `validate`, `release` on Epic; `plan`, `implement` on Feature
- [ ] Concurrent `save()` calls serialized via async mutex
- [ ] Unit tests pass: `bun --bun vitest run` (store-related test files)
