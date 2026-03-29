# Manifest Schema

## Context
Feature lifecycle needs a local JSON artifact that tracks state across phases and optionally includes GitHub references. The github-cli-migration redesigns the manifest as pure pipeline state with a new location and CLI-only mutation model.

## Decision
Manifest is pure pipeline state at `.beastmode/pipeline/<slug>/manifest.json` (local-only, gitignored). Contains: single epic with top-level `phase` field, features array with `slug`, `status`, and `plan` path, artifact references accumulated across phases, worktree info (branch, path), optional `github` block for issue numbers. CLI creates at first phase dispatch (design) with slug, phase: "design", and worktree info. Enriched from phase output files (`state/<phase>/YYYY-MM-DD-<slug>.output.json`) at each checkpoint. CLI is the sole mutator — skills never read or write the manifest. CLI rebuilds from worktree branch scanning on cold start. Four feature statuses: pending, in-progress, blocked, completed.

## Rationale
Pure pipeline state (no architectural decisions in the manifest) keeps the schema minimal and focused. CLI-only mutation eliminates race conditions from skills writing manifests. Gitignored local-only storage means manifest is never committed — it's operational state, not content. Cold-start reconstruction from branches means the manifest is recoverable.

## Source
.beastmode/state/design/2026-03-28-github-phase-integration.md
.beastmode/state/design/2026-03-29-github-cli-migration.md
