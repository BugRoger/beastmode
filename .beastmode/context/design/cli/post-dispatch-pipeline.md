# Post-Dispatch Pipeline

## Context
After each phase dispatch, the CLI needs to read results, update the manifest, and sync GitHub. The manifest-file-management design introduces Stop hook output.json generation and a mutation-return pattern for github-sync.ts.

## Decision
After every phase dispatch: Stop hook generates output.json from artifact frontmatter, CLI reads output.json from `artifacts/<phase>/` by hex slug match (immutable, no stale-artifact mismatches), enriches manifest via manifest.ts pure functions (enrich, advancePhase, shouldAdvance), optionally calls `store.rename()` for design phase (updates in-memory state only), then runs single `store.save()`, then `syncGitHubForEpic()`. The shared helper encapsulates loadConfig, discoverGitHub, syncGitHub, and mutation write-back — returned mutations (newly created issue numbers) are applied via setGitHubEpic()/setFeatureGitHubIssue() + store.save(). Accepts optional resolved: ResolvedGitHub param for caller-owned discovery caching. Same code path for manual `beastmode <phase>` and watch loop dispatch. Post-only stateless sync. Non-design phases fail fast if slug not found in store. `resolveDesignSlug()` (commit-message regex) deleted — output.json hex lookup replaces it. `skipFinalPersist` flag deleted — single persist path needs no coordination.

Secondary guard for design phase: before the design case generates a `DESIGN_COMPLETED` event, verifies design output exists via `loadWorktreePhaseOutput()`. If missing, returns early with empty event list — prevents state machine from advancing to plan phase even if primary gate in phase.ts is somehow bypassed (ReconcilingFactory edge case). Purely additive — no changes to event generation for other phases.

## Rationale
Stop hook generates output.json by infrastructure, eliminating skill-authored output steps. Pure function enrichment is testable without filesystem mocks. Mutation-return from github-sync.ts ensures all manifest writes go through the store, maintaining the single-writer invariant. The secondary guard provides defense-in-depth against the state machine seeing an incomplete design — the primary gate in phase.ts handles cleanup, but the guard prevents advancement independently.

As of cli-restructure (2026-04-03), post-dispatch.ts is absorbed into pipeline/runner.ts. Both manual CLI and watch loop call the same runner: (1) worktree prepare, (2) rebase onto local main (skip for design), (3) settings create, (4) early issue creation (pre-dispatch), (5) dispatch, (6) artifact collect, (7) manifest reconcile, (8) manifest advance, (8.1) GitHub mirror, (8.5) range-based commit amend (post-sync, pre-push), (8.7) git push branches + tags (pure git, not gated on github.enabled), (8.9) branch linking via createLinkedBranch GraphQL (gated on github.enabled), (9) worktree cleanup (release only). The rebase step targets local main with no network dependency; on conflict it aborts and proceeds on stale base. The amend-before-push ordering ensures no force-push is needed from the CLI.

## Source
.beastmode/artifacts/design/2026-03-29-github-cli-migration.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
.beastmode/artifacts/design/2026-03-31-github-sync-watch-loop.md
.beastmode/artifacts/design/2026-04-01-slug-redesign.md
.beastmode/artifacts/design/2026-04-01-c3cc89.md
