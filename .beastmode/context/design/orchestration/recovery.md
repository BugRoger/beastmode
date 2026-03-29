## Context
The pipeline needs crash recovery without session persistence or complex state machines. With cmux integration, stale cmux surfaces from previous sessions must also be reconciled.

## Decision
State files are the recovery point. On startup, scan for existing worktrees with uncommitted changes. Re-dispatch from last committed state. Lockfile prevents duplicate instances. When cmux is enabled, also query cmux for existing workspaces matching known epic slugs — adopt live surfaces (process still running) into the DispatchTracker, close dead surfaces, remove empty workspaces.

## Rationale
Stateless recovery model — the filesystem is the checkpoint. cmux reconciliation prevents double-dispatch of agents that survived a watch loop restart while keeping the recovery model simple: check what exists, adopt or clean up.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-28-cmux-integration.md`
