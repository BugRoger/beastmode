# Testing Approach

## Context
CmuxClient wraps Bun.spawn which cannot be called in unit tests without a real cmux binary.

## Decision
SpawnFn type alias for the Bun.spawn subset used by exec(). Constructor accepts optional spawn parameter. Tests use mockProc() to create ReadableStream-based fakes matching exec()'s consumption via new Response(stream).text(). cmuxAvailable() tested separately with spyOn(Bun, "spawn").

## Rationale
Dependency injection at the spawn level gives full control over stdout, stderr, and exit code without process spawning. ReadableStream mocks ensure the consumption path matches production (Response.text()). 33 tests cover all methods, all error classes, idempotent close logic, CLI argument construction, and timeout configuration.

## Source
cli/src/__tests__/cmux-client.test.ts
