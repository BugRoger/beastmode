# State Authority Model

## Context
The original github-state-model design positioned GitHub as the source of truth for lifecycle status. The github-phase-integration PRD reverses this: manifest JSON is the operational authority, GitHub is a synced mirror. The github-cli-migration further refines this by moving the manifest to a gitignored pipeline directory and making the CLI the sole mutator.

## Decision
Manifest JSON is the operational authority for feature lifecycle, living at `.beastmode/pipeline/<slug>/manifest.json` (gitignored, local-only). The CLI is the sole mutator with four operations: seed (at first dispatch), enrich (from phase output files), advance-phase, and reconstruct (cold-start from branch scanning). Skills communicate via phase output files (`state/<phase>/YYYY-MM-DD-<slug>.output.json`) and never read or write the manifest. Manifest schema is pure pipeline state: slug, phase, features, artifacts, worktree, optional github block -- no architectural decisions or content. GitHub is updated post-dispatch as a mirror providing the global cross-design view. State files (.beastmode/state/) remain the content store for PRDs, plans, and reports. Four feature statuses: pending, in-progress, blocked, completed. GitHub failures warn and continue -- absence of `github` data is the signal, no explicit failure flag.

## Rationale
Local-first authority means the workflow never depends on network availability. GitHub provides the dashboard view across all in-flight work but is not authoritative. Gitignored local-only manifest eliminates merge conflicts in parallel worktrees. Single mutator (CLI) prevents race conditions and guarantees consistent state.

## Source
state/design/2026-03-28-github-phase-integration.md
state/plan/2026-03-28-github-phase-integration.manifest.json
state/plan/2026-03-29-github-cli-migration-manifest-redesign.md
state/plan/2026-03-28-github-cli-migration.manifest.json
