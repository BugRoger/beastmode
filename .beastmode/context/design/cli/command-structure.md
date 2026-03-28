## Context
The CLI needs a clear command surface that covers manual phase execution, autonomous pipeline orchestration, and state visibility.

## Decision
Three commands: `run <phase> <args>` for single phase execution, `watch` for autonomous pipeline, `status` for state and cost visibility. Design phase exception uses `Bun.spawn` instead of SDK for interactive stdio.

## Rationale
Minimal command surface covers all use cases. Design exception preserves human interaction without forcing SDK workarounds for interactive sessions.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
