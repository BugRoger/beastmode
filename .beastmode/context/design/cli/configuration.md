## Context
The CLI needs configuration for poll intervals and CLI-specific settings without introducing a separate config file.

## Decision
Reuse `.beastmode/config.yaml` with a new `cli:` section. `cli.interval` controls poll interval (default 60 seconds).

## Rationale
Single config file reduces cognitive overhead. The `cli:` namespace avoids collision with existing config sections.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
