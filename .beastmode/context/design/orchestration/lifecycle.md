## Context
Pipeline lifecycle management needs to move from skill subcommands to CLI commands.

## Decision
Start via `beastmode watch` (foreground, Ctrl+C to stop). Cost tracking per dispatch in `.beastmode-runs.json`. Lockfile prevents duplicate instances. No auto-drain or idle-timeout.

## Rationale
Foreground process is simpler than background daemon and provides immediate visibility. Lockfile prevents the accidental double-dispatch failure mode.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
