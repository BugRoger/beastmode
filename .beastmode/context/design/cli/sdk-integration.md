## Context
Phase execution needs session management with clean cancellation. The dispatch mechanism uses iTerm2 terminals exclusively.

## Decision
`SessionFactory` interface with `create()`, optional `cleanup()`, optional `setBadgeOnContainer()`, and optional `checkLiveness()` methods. `ITermSessionFactory` is the sole implementation — creates iTerm2 terminal tabs via AppleScript, runs `beastmode <phase> <slug>` in each tab. Design phase always uses `Bun.spawn` for interactive stdio via `runInteractive()`, bypassing the factory.

## Rationale
The SessionFactory interface preserves extensibility for future dispatch strategies while keeping the current implementation focused on iTerm2. Single implementation eliminates strategy selection complexity.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
