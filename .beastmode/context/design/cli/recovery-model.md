## Context
The pipeline needs crash recovery without session persistence or complex state machines.

## Decision
State files are the recovery point. On startup, scan for existing worktrees with uncommitted changes. Re-dispatch from last committed state. Lockfile (`cli/.beastmode-watch.lock`) prevents duplicate instances.

## Rationale
Stateless recovery model — the filesystem is the checkpoint. No need for session persistence, transaction logs, or complex recovery protocols.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
