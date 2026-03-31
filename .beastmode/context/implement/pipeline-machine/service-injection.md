# Service Injection

## Context
The machine definition needs to invoke async side effects (GitHub sync) but must remain decoupled from the filesystem and network layer for testability.

## Decision
Services use `fromPromise` with an injectable function via input. `syncGitHubService` accepts `{ syncFn?: () => Promise<SyncGitHubResult> }`. Missing syncFn returns a no-op result with a warning. Errors are caught internally and returned as a warnings array.

## Rationale
Injection via input keeps the machine definition pure and testable. The non-throwing contract means the epic machine never gets stuck in a failed invocation state.

## Source
.beastmode/artifacts/implement/2026-03-31-xstate-pipeline-machine-machine-definition.md
