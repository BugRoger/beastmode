# Source of Truth Split

## Context
Beastmode needs a clear authority model for feature lifecycle state. The original design positioned GitHub as the status authority, but network dependency and local-first workflows demand a local-first model. The github-cli-migration moves all sync logic from skill markdown into the TypeScript CLI.

## Decision
Manifest JSON is the operational authority for feature lifecycle (per-branch, per-worktree). GitHub is a one-way synced mirror — the CLI never reads GitHub state to update the manifest. Sync runs after every phase dispatch in the CLI via `syncGitHub(manifest, config)`, not at skill checkpoint boundaries. Bootstrap write-back (writing issue numbers back after creation) is the sole exception to one-way flow. Repo files own content (design docs, plans, validation reports). Issue bodies link to repo artifacts via relative paths.

## Rationale
Local manifest ensures workflow never depends on network connectivity. Moving sync from skills to CLI centralizes the integration surface, making it testable with standard tooling. Post-dispatch sync (same code path for manual and watch-loop) eliminates scattered markdown-interpreted bash snippets. One-way sync keeps the reconciliation logic simple and deterministic.

## Source
.beastmode/state/design/2026-03-28-github-state-model.md
.beastmode/state/design/2026-03-28-github-phase-integration.md
.beastmode/state/design/2026-03-29-github-cli-migration.md
