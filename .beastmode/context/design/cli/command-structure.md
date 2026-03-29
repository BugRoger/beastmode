## Context
The CLI needs a clear command surface that covers manual phase execution, autonomous pipeline orchestration, state visibility, and manual GitHub reconciliation.

## Decision
Phase as direct argument: `beastmode <phase> <slug>` for single phase execution (no `run` subcommand), `watch` for autonomous pipeline, `status` for state visibility, `sync` for manual GitHub reconciliation. `beastmode sync` reads all manifests via store.list(), runs syncGitHub for each, and applies mutations. `--clean` flag additionally closes open issues that don't correspond to any manifest, removes features from the board, and cleans stale labels. Design phase exception uses `Bun.spawn` instead of SDK for interactive stdio.

## Rationale
Minimal command surface covers all use cases. Dropping `run` makes the phase name the verb — cleaner ergonomics. Design exception preserves human interaction without forcing SDK workarounds for interactive sessions. The sync command provides a one-shot reconciliation tool for bootstrapping a clean state and fixing drift.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-28-cli-worktree-management.md`
`.beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md`
