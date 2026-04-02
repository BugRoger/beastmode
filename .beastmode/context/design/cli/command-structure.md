## Context
The CLI needs a clear command surface that covers manual phase execution, autonomous pipeline orchestration, and state visibility.

## Decision
Phase as direct argument: `beastmode <phase> <slug>` for single phase execution (no `run` subcommand), `watch` for autonomous pipeline, `status` for state visibility with optional `--watch`/`-w` live dashboard mode (2-second polling, ANSI full-screen redraw, change highlighting, watch loop indicator via lockfile), `cancel <slug>` for full cleanup with `--force` flag for automation, `compact` for standalone context tree compaction (dispatches compaction agent, no worktree needed, always runs regardless of 5-release counter). Design phase exception uses `Bun.spawn` instead of SDK for interactive stdio.

## Rationale
Minimal command surface covers all use cases. Dropping `run` makes the phase name the verb — cleaner ergonomics. Design exception preserves human interaction without forcing SDK workarounds for interactive sessions. Status --watch reuses existing rendering as a polling loop — no new dependencies, pure ANSI escape codes.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-28-cli-worktree-management.md`
`.beastmode/artifacts/design/2026-03-30-status-watch.md`
`.beastmode/artifacts/design/2026-03-31-context-tree-compaction.md`
`.beastmode/artifacts/design/2026-04-02-cancel-cleanup.md`
