# Cucumber API-Behavioral World Pattern

**Context:** logging-cleanup integration-tests (2026-04-05). The LoggingWorld pattern tests a concrete module API (Logger) by injecting a mock sink and asserting on captured LogEntry records. No source file reading, no store CRUD.

## Pattern

Create a Cucumber World class that:
1. Instantiates the module under test (e.g., `createLogger`) with a mock dependency (e.g., mock LogSink)
2. The mock dependency captures calls for later assertion (array of captured entries)
3. World methods expose the captured state for Then steps
4. Before/After hooks reset the instance per scenario

**Decision:** Use the API-behavioral pattern when testing a module's runtime contract (interface shape, delegation, data flow) without rendering or storage concerns.

## When to Use

- Module under test has a clean injected-dependency seam (factory function or constructor)
- Assertions are on data flowing through the seam (captured calls, emitted records)
- No component rendering needed, no filesystem state needed

## Implementation Conventions

- World file: `features/support/<domain>-world.ts`
- Mock dependency is a local object with a capture array, NOT a mock.module() call
- Before hook resets the World instance (new logger, empty capture array) per scenario
- Profile entry in `cucumber.json` with explicit import list

**Source:** .beastmode/artifacts/implement/2026-04-05-logging-cleanup-integration-tests.md
