# DI Spawn Injection for Test Isolation

## Observation 1
### Context
During cmux-client implementation, 2026-03-29. CmuxClient class wraps CLI binary calls via a SpawnFn type injected through the constructor.
### Observation
Constructor-injected SpawnFn eliminated all spy/mock cleanup across 33 unit tests. Each test creates a fresh client with a mock spawn function — no global state mutation, no afterEach cleanup. Only the 2 tests for the standalone cmuxAvailable() helper (which calls Bun.spawn directly) required spyOn with manual restore.
### Rationale
When a module's only side effect is process spawning, injecting the spawn function through the constructor makes tests self-contained and cleanup-free.
### Source
cli/src/__tests__/cmux-client.test.ts
### Confidence
[LOW] — first-time observation, single feature
