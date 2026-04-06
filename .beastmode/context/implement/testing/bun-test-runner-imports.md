# Vitest Test Runner Imports

## Context
The project uses vitest as the test framework with Bun as the runtime (`bun --bun vitest run`). All 112+ test files in the codebase import from `vitest`. Zero test files use `bun:test`.

Originally (structured-task-store epoch), the project used `bun:test` directly. It has since migrated to vitest with Bun as the runtime engine.

## Decision
All new test files in this project MUST import from `vitest`, not `bun:test`.

```typescript
// Correct — vitest is the test framework
import { describe, it, expect, beforeEach } from "vitest";

// Wrong — bun:test is not used in this project
import { describe, it, expect, beforeEach } from "bun:test";
```

## Rationale
The CLI uses `bun --bun vitest run` as its test command. Vitest provides the test API; Bun provides the runtime. Agent-generated test files should follow the established convention of importing from vitest.

## Source
Updated during details-panel-stats release retro (2026-04-06). Original rule from structured-task-store epoch was stale.
