## Context
The pipeline needs crash recovery without session persistence or complex state machines.

## Decision
State files are the recovery point. On startup, scan for existing worktrees with uncommitted changes. Re-dispatch from last committed state. Lockfile prevents duplicate instances.

## Rationale
Stateless recovery model — the filesystem is the checkpoint. Simple and deterministic: check what exists, re-dispatch from there.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
