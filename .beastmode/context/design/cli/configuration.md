## Context
The CLI needs configuration for poll intervals, CLI-specific settings, and optional cmux integration without introducing separate config files.

## Decision
Reuse `.beastmode/config.yaml` with `cli:` section. `cli.interval` controls poll interval (default 60 seconds). `cli.dispatch-strategy` controls dispatch mechanism (sdk | cmux | auto) — `auto` uses cmux if available, falls back to SDK. No per-notification or per-cleanup config knobs — notifications fixed at errors+blocks, cleanup fixed at on-release.

## Rationale
Single config field reduces cognitive overhead and configuration surface area. The `cli:` namespace avoids collision with existing config sections. Separate `cmux:` section is eliminated — dispatch strategy is the only knob needed.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md`
