# Source of Truth Split

## Context
Beastmode needs a clear authority model for feature lifecycle state. The original design positioned GitHub as the status authority, but network dependency and local-first workflows demand a local-first model. The github-cli-migration moves all sync logic from skill markdown into the TypeScript CLI. The github-no-for-real-sync design moves sync from post-dispatch into store.save() (sync-on-save) for guaranteed consistency.

## Decision
Manifest JSON is the operational authority for feature lifecycle (per-branch, per-worktree). GitHub is a one-way synced mirror — the CLI never reads GitHub state to update the manifest. Sync triggers inside store.save() via a sync-on-save hook — every manifest write runs syncGitHub(manifest, config) when github.enabled is true, with a module-level re-entrancy guard to prevent write-back loops. Bootstrap write-back (writing issue numbers back after creation) triggers a guarded follow-up save that skips sync. `beastmode sync` provides manual full-reconciliation across all manifests. Repo files own content (design docs, plans, validation reports in `artifacts/`). Issue bodies link to repo artifacts via relative paths.

## Rationale
Local manifest ensures workflow never depends on network connectivity. Sync-on-save guarantees every state change reaches GitHub without relying on post-dispatch wiring. Re-entrancy guard prevents infinite loops from mutation write-back. Moving sync from post-dispatch into store.save() eliminates the gap where manifests could be saved without syncing. One-way sync keeps the reconciliation logic simple and deterministic.

## Source
.beastmode/artifacts/design/2026-03-28-github-state-model.md
.beastmode/artifacts/design/2026-03-28-github-phase-integration.md
.beastmode/artifacts/design/2026-03-29-github-cli-migration.md
.beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md
