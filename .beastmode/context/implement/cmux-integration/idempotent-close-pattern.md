# Idempotent Close Pattern

## Context
Plan acceptance criteria required closeWorkspace and closeSurface to handle already-closed gracefully.

## Decision
Close methods catch CmuxError, check if message matches /not found/i, and return void if so. CmuxConnectionError is always rethrown (binary missing is not an idempotent case). All other CmuxError variants are rethrown.

## Rationale
Idempotent close prevents errors during cleanup when surfaces or workspaces are already gone (e.g., user manually closed a terminal). Connection errors must propagate because they indicate the cmux daemon itself is unavailable, not just the target resource.

## Source
cli/src/cmux-client.ts
