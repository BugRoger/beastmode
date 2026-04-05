## Context
The CLI needs configuration for poll intervals and CLI-specific settings without introducing separate config files.

## Decision
Reuse `.beastmode/config.yaml` with `cli:` and `github:` sections. `cli.interval` controls poll interval (default 60 seconds). No dispatch strategy config — iTerm2 is the sole dispatch mechanism.

## Rationale
Single config file reduces cognitive overhead and configuration surface area. The `cli:` namespace avoids collision with existing config sections. Strategy selection is eliminated — iTerm2 is the only dispatch backend.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
