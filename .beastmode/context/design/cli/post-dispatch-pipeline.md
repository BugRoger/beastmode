# Post-Dispatch Pipeline

## Context
After each phase dispatch, the CLI needs to read results, update the manifest, and sync GitHub. The manifest-file-management design introduces Stop hook output.json generation and a mutation-return pattern for github-sync.ts.

## Decision
After every phase dispatch: Stop hook generates output.json from artifact frontmatter, CLI reads output.json from `artifacts/<phase>/` by hex slug match (immutable, no stale-artifact mismatches), enriches manifest via manifest.ts pure functions (enrich, advancePhase, shouldAdvance), optionally calls `store.rename()` for design phase (updates in-memory state only), then runs single `store.save()`, then `syncGitHubForEpic()`. The shared helper encapsulates loadConfig, discoverGitHub, syncGitHub, and mutation write-back — returned mutations (newly created issue numbers) are applied via setGitHubEpic()/setFeatureGitHubIssue() + store.save(). Accepts optional resolved: ResolvedGitHub param for caller-owned discovery caching. Same code path for manual `beastmode <phase>` and watch loop dispatch. Post-only stateless sync. Non-design phases fail fast if slug not found in store. `resolveDesignSlug()` (commit-message regex) deleted — output.json hex lookup replaces it. `skipFinalPersist` flag deleted — single persist path needs no coordination.

## Rationale
Stop hook generates output.json by infrastructure, eliminating skill-authored output steps. Pure function enrichment is testable without filesystem mocks. Mutation-return from github-sync.ts ensures all manifest writes go through the store, maintaining the single-writer invariant.

## Source
.beastmode/artifacts/design/2026-03-29-github-cli-migration.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
.beastmode/artifacts/design/2026-03-31-github-sync-watch-loop.md
.beastmode/artifacts/design/2026-04-01-slug-redesign.md
