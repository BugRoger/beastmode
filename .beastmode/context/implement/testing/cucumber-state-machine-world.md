# Cucumber State-Machine World Pattern

**Context:** heartbeat-countdown-timer (2026-04-12). The HeartbeatCountdownWorld pattern tests a pure state machine by holding state directly in the World and exercising transition logic in step definitions. No source file reads, no store CRUD, no mock dependency seam.

## Pattern

Create a Cucumber World class that:
1. Holds the state struct directly as a World field (e.g., `state: CountdownState`)
2. Step definitions mutate `this.state` by calling pure transition functions or setting fields directly
3. Then steps assert on World state fields — no captured calls, no emitted records
4. Before hook resets the World state to its initial value per scenario

**Decision:** Use the state-machine pattern when the system under test is a set of pure transition functions with no I/O, no async, and no injected dependencies — the World IS the runtime.

## When to Use

- System under test is a pure state machine (transition functions + discriminated union state)
- No component rendering needed, no filesystem state needed
- No dependency seam to inject — logic is stateless functions
- Assertions read World state fields directly (mode, display string, counters)

## Implementation Conventions

- World file: `features/support/<domain>-world.ts` — holds state struct, exposes `reset()` method
- State struct mirrors the production `CountdownState` interface (or equivalent) — steps read/write fields directly
- Step definitions import and call production pure functions (e.g., `handleScanComplete`, `decrementCountdown`) OR manipulate state inline for simple transitions
- Before hook calls `this.reset()` — no After hook needed (no timers, no I/O to tear down)
- Profile entry in `cucumber.json` with explicit import list

## Canonical Example

- World: `cli/features/support/heartbeat-countdown-world.ts` — `HeartbeatCountdownWorld extends World`, holds `state: CountdownState`, `reset()` restores defaults
- Steps: `cli/features/step_definitions/heartbeat-countdown.steps.ts` — Given/When/Then mutate and assert `this.state` directly
- Production module: `cli/src/dashboard/use-countdown.ts` — pure transition functions (`handleScanStarted`, `handleScanComplete`, `decrementCountdown`, `formatCountdown`) separated from the `useCountdown` React hook

## Contrast with Other Patterns

| Pattern | World holds | Assertions on |
|---------|-------------|---------------|
| Source-Analysis | file path + parse result | parsed string content |
| Store-Lifecycle | TaskStore instance | store query results |
| API-Behavioral | module instance + mock sink | captured call records |
| **State-Machine** | **state struct** | **state field values** |

**Source:** .beastmode/artifacts/implement/2026-04-12-heartbeat-countdown-timer-b2b8-heartbeat-countdown-display.md
