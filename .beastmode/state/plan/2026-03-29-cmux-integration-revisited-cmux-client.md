# cmux Client

**Design:** `.beastmode/state/design/2026-03-29-cmux-integration-revisited.md`

## User Stories

Infrastructure feature — provides the typed cmux CLI wrapper consumed by cmux-strategy, startup-reconciliation, and surface-cleanup features.

## What to Build

Create a `CmuxClient` module that communicates with the cmux binary by shelling out via `Bun.spawn` with `--json` flag for structured responses. The client wraps all cmux operations needed by the pipeline:

- `ping()` — Check if cmux is running and accessible. Used by `SessionFactory` for `auto` mode detection.
- `newWorkspace(name)` — Create a named workspace. Returns workspace ID.
- `newSplit(workspaceId, opts)` — Create a new surface within a workspace. Returns surface ID.
- `sendSurface(surfaceId, command)` — Send a command string to a surface for execution.
- `closeSurface(surfaceId)` — Close a specific surface.
- `closeWorkspace(workspaceId)` — Close a workspace and all its surfaces.
- `listWorkspaces()` — List all workspaces with their surfaces and process status. Used for startup reconciliation.
- `notify(title, body)` — Send a desktop notification via cmux.

The client must handle: missing binary (throw typed error), JSON parse failures, process timeouts, and non-zero exit codes. All operations should return typed response objects. Authentication is automatic via cmux process ancestry (cmuxOnly auth mode).

No retry logic — callers handle retries. No caching — cmux state changes between calls.

## Acceptance Criteria

- [ ] `CmuxClient` module exports all 8 methods with typed signatures
- [ ] `ping()` returns boolean (true if cmux reachable, false otherwise)
- [ ] `newWorkspace()`, `newSplit()` return IDs from cmux JSON response
- [ ] `sendSurface()` sends command string to specified surface
- [ ] `closeSurface()`, `closeWorkspace()` handle already-closed gracefully
- [ ] `listWorkspaces()` returns structured workspace/surface data with process liveness
- [ ] `notify()` fires desktop notification
- [ ] Missing binary throws typed `CmuxNotAvailableError`
- [ ] Unit tests mock `Bun.spawn` and verify CLI argument construction and JSON parsing
