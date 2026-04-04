---
phase: plan
slug: structured-task-store
epic: structured-task-store
feature: integration-tests
wave: 1
---

# Integration Tests

**Design:** `.beastmode/artifacts/design/2026-04-04-structured-task-store.md`

## User Stories

1. As an **agent**, I want to query the store for unblocked features (`beastmode store ready`), so that I can determine what work is available without scanning markdown files.
2. As an **agent**, I want to create and update features with hash-based IDs via CLI commands, so that concurrent worktree agents never collide on entity identifiers.
3. As a **pipeline orchestrator**, I want cross-epic dependency modeling (`depends_on`), so that the watch loop can detect when epic B is blocked by epic A's incomplete features.
4. As a **developer**, I want to browse the full entity hierarchy via `beastmode store tree`, so that I can understand the pipeline state at a glance from one file.
5. As a **developer**, I want to reference epics by either hash ID (`bm-a3f8`) or human slug (`cli-restructure`) in all phase commands, so that I can use whichever is more convenient.
6. As a **pipeline orchestrator**, I want dependency-based ordering to replace static wave numbers, so that partial failures and re-planning don't require manual wave reassignment.
7. As a **developer**, I want typed artifact fields on entities (`design`, `plan`, `implement`, `validate`, `release`), so that artifact references are explicit per entity type rather than a generic phase-keyed record.
8. As an **agent**, I want all store commands to output JSON, so that I can parse structured responses without format guessing.
9. As a **developer**, I want a pluggable store backend interface, so that the JSON file backend can be swapped for git-synced JSON, SQLite, or Dolt in the future without changing the CLI or agent commands.
10. As a **pipeline orchestrator**, I want `beastmode store blocked` to show all entities with `status=blocked`, so that intervention-requiring failures are immediately visible.

## What to Build

BDD integration test suite covering all 10 user stories for the structured task store. The integration artifact at `.beastmode/artifacts/plan/2026-04-04-structured-task-store-integration.md` contains 35 new Gherkin scenarios and 2 modified scenarios.

New `.feature` files organized by user story:
- Store ready command (US-1): 5 scenarios covering no-dep features, incomplete deps, completed deps, empty results, multi-epic spans
- Hash-based entity IDs (US-2): 5 scenarios covering epic ID generation, feature ID generation, uniqueness, preservation on update, CLI return
- Cross-epic dependency modeling (US-3): 4 scenarios covering blocked epic, unblocked epic, multiple deps, circular detection
- Store tree hierarchy (US-4): 4 scenarios covering single epic, multiple epics, dependency display, empty store
- Dual ID/slug reference (US-5): 5 scenarios covering hash lookup, slug lookup, phase command hash, phase command slug, ambiguous reference
- Dependency-based ordering (US-6): 6 scenarios covering no-dep availability, dependent waiting, prerequisite completion, diamond graph, re-planning, partial failure isolation
- Typed artifact fields (US-7): 4 scenarios covering design field, plan field, implement field, scenario outline for all phases
- JSON output (US-8): 6 scenarios covering ready, tree, blocked, create, update, error JSON output
- Pluggable backend (US-9): 3 scenarios covering interface satisfaction, operation consistency, backend swap
- Store blocked (US-10): 5 scenarios covering blocked features, exclusion, multi-epic, epic-level blocked, healthy pipeline

Modified existing feature files:
- `cli/features/watch-loop-happy-path.feature`: Replace wave-based tables with `depends_on` dependency declarations
- `cli/features/wave-failure.feature`: Replace wave ordering with dependency ordering semantics

Step definitions wire Gherkin steps to the `TaskStore` interface and CLI command execution.

## Acceptance Criteria

- [ ] All 35 new Gherkin scenarios from the integration artifact are implemented as `.feature` files
- [ ] 2 modified scenarios updated in existing feature files to use `depends_on` semantics
- [ ] Step definitions compile and wire to store interface (tests will fail until store-backend and store-cli are implemented)
- [ ] Feature files are tagged with `@structured-task-store` for selective execution
- [ ] `bun --bun node_modules/.bin/cucumber-js --tags @structured-task-store --dry-run` exits 0 (syntax valid, steps wired)
