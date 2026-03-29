# State Authority Model

## Context
The original github-state-model design positioned GitHub as the source of truth for lifecycle status. The github-phase-integration PRD reverses this: manifest JSON is the operational authority, GitHub is a synced mirror. The github-cli-migration further refines this by moving the manifest to a gitignored pipeline directory and making the CLI the sole mutator.

## Decision
Manifest JSON is the operational authority for feature lifecycle, living at `.beastmode/state/<slug>/manifest.json` (gitignored, local-only). Managed through two modules: manifest-store.ts (filesystem boundary, sole disk accessor for CRUD) and manifest.ts (pure state machine functions, no fs imports, all immutable). The CLI is the sole mutator with operations through these modules: seed (store.create), enrich (manifest.enrich), advance/regress phase, cancel, set GitHub metadata, and reconstruct (cold-start from branch scanning). Skills are pure artifact producers -- they write artifacts with YAML frontmatter to `artifacts/<phase>/` and never read or write manifests or output.json. A Stop hook generates output.json from artifact frontmatter as the sole completion signal (replaces .dispatch-done.json). github-sync.ts returns mutation objects -- callers apply via manifest.ts pure functions and save through manifest-store.ts. Manifest schema is pure pipeline state: slug, phase, features, artifacts, worktree, optional github block, structured blocked field ({ gate, reason } | null). Artifact files (.beastmode/artifacts/) are the committed content store for PRDs, plans, and reports. Four feature statuses: pending, in-progress, blocked, completed. GitHub failures warn and continue -- absence of `github` data is the signal.

## Rationale
Local-first authority means the workflow never depends on network availability. GitHub provides the dashboard view across all in-flight work but is not authoritative. Gitignored local-only manifest eliminates merge conflicts in parallel worktrees. Single mutator (CLI) prevents race conditions and guarantees consistent state.

## Source
state/design/2026-03-28-github-phase-integration.md
state/plan/2026-03-28-github-phase-integration.manifest.json
state/plan/2026-03-29-github-cli-migration-manifest-redesign.md
state/plan/2026-03-28-github-cli-migration.manifest.json
state/design/2026-03-29-manifest-file-management.md
