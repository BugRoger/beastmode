# Sync Engine

## Context
Multiple phase checkpoints needed GitHub sync (labels, issues, project board). The original approach used a shared skill utility (`skills/_shared/github.md`) invoked from each checkpoint. This distributed responsibility across skills and made sync unreliable.

## Decision
Single CLI-owned TypeScript module exporting `syncGitHub(manifest, config)`. Called post-dispatch after every phase. Stateless: reads manifest, reconciles GitHub state, writes back bootstrap data (new issue numbers). All `gh` CLI calls go through `Bun.spawn` with try/catch and warn-and-continue. Replaces `skills/_shared/github.md` entirely. Reconciliation logic: blast-replace `phase/*` labels, create-if-missing issues, set `status/*` labels, close completed features, close epic when done.

## Rationale
Moving sync to the CLI eliminates skill-level GitHub awareness, making skills pure content processors. A single entry point is testable with standard TypeScript tooling (mock `Bun.spawn`). Post-dispatch placement guarantees sync runs regardless of skill behavior.

## Source
state/plan/2026-03-29-github-cli-migration-github-sync-engine.md
state/plan/2026-03-29-github-cli-migration-skill-cleanup.md
state/plan/2026-03-28-github-cli-migration.manifest.json
