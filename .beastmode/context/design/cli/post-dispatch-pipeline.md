# Post-Dispatch Pipeline

## Context
After each phase dispatch, the CLI needs to read results and update the manifest. The github-no-for-real-sync design moves GitHub sync out of post-dispatch into store.save() (sync-on-save), so post-dispatch focuses solely on output reading and manifest enrichment.

## Decision
After every phase dispatch: Stop hook generates output.json from artifact frontmatter, CLI reads output.json from `artifacts/<phase>/`, enriches manifest via manifest.ts pure functions (enrich, advancePhase, shouldAdvance). GitHub sync is NOT called in post-dispatch — it triggers automatically inside store.save() when the enriched manifest is saved. github-sync.ts returns mutations instead of mutating manifests in-place — caller applies via manifest.ts + store.save() with re-entrancy guard preventing write-back loops. Same code path for manual `beastmode <phase>` and watch loop dispatch. Post-only stateless sync.

## Rationale
Stop hook generates output.json by infrastructure, eliminating skill-authored output steps. Pure function enrichment is testable without filesystem mocks. Mutation-return from github-sync.ts ensures all manifest writes go through the store, maintaining the single-writer invariant. Moving sync into store.save() guarantees every manifest mutation reaches GitHub without relying on callers remembering to sync.

## Source
.beastmode/artifacts/design/2026-03-29-github-cli-migration.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
.beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md
