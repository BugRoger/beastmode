# Cmux Integration

## Client Architecture
- CmuxClient is a class with dependency-injected SpawnFn, NOT free functions — deviation from plan, approved for testability
- ICmuxClient interface extracted for strategy pattern use by downstream features (cmux-strategy, dispatch-abstraction)
- Constructor accepts optional { timeoutMs, spawn } — defaults to 10s timeout and Bun.spawn
- All cmux communication goes through a private exec() method that shells out to the `cmux` binary
- No retry logic, no caching — callers own retry policy

## Method Signatures
- 9 methods total (8 interface + 1 module-level helper), not the original 8 free functions from plan
- Plan renames: newWorkspace -> createWorkspace, newSplit -> createSurface, sendSurface -> sendText
- Added getSurface(workspace, surface) — returns CmuxSurface | null, not in original plan
- Added cmuxAvailable() module-level convenience — creates a 3s-timeout client and pings
- Workspace methods take name string; surface methods take (workspace, surface) pair — no opaque IDs

## Error Hierarchy
- CmuxError base class for all cmux failures
- CmuxConnectionError — binary not found, not running, connection refused (plan called this CmuxNotAvailableError)
- CmuxProtocolError — JSON parse failures from --json responses
- CmuxTimeoutError — command exceeded timeoutMs (kill + throw)
- Error detection: stderr/stdout content matching for "not running" and "connection refused" patterns

## Idempotent Close Pattern
- closeWorkspace and closeSurface swallow "not found" errors — already-closed is success
- CmuxConnectionError is always rethrown even in close methods — binary missing is not idempotent
- Other CmuxError variants are rethrown — only "not found" is swallowed

## Testing Approach
- Injectable SpawnFn replaces Bun.spawn for unit testing — no real process spawning in tests
- mockProc() helper creates ReadableStream-based fakes matching exec()'s consumption via new Response(stream).text()
- 33 unit tests covering: all 9 methods, all error classes, idempotent close logic, CLI argument construction, timeout config
- cmuxAvailable() tested separately with spyOn(Bun, "spawn") since it uses the real default
