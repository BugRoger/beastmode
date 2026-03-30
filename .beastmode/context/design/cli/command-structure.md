## Context
The CLI needs a clear command surface that covers manual phase execution, autonomous pipeline orchestration, and state visibility.

## Decision
Phase as direct argument: `beastmode <phase> <slug>` for single phase execution (no `run` subcommand), `watch` for autonomous pipeline, `status` for state and cost visibility with optional `--watch`/`-w` live dashboard mode (2-second polling, ANSI full-screen redraw, change highlighting, blocked gate details, watch loop indicator via lockfile). Design phase exception uses `Bun.spawn` instead of SDK for interactive stdio.

## Rationale
Minimal command surface covers all use cases. Dropping `run` makes the phase name the verb — cleaner ergonomics. Design exception preserves human interaction without forcing SDK workarounds for interactive sessions. Status --watch reuses existing rendering as a polling loop — no new dependencies, pure ANSI escape codes.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-28-cli-worktree-management.md`
`.beastmode/artifacts/design/2026-03-30-status-watch.md`
