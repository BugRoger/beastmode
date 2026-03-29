# scanner-test-suite

**Design:** `.beastmode/state/design/2026-03-29-bulletproof-state-scanner.md`
**Architectural Decisions:** see manifest

## User Stories

6. As a developer, I want comprehensive unit tests for every phase transition and edge case, so that future changes to the scanner don't regress correctness.

## What to Build

Rewrite the existing test suite to cover the new scanner behavior. Tests use Bun test runner (`bun test`) with mock filesystem for isolation.

Test coverage must include:
- All phase transitions: plan → implement → validate → release → released
- Reading `manifest.phase` directly (the new primary path)
- Merge conflict auto-resolution (clean resolve, unresolvable content, multi-block conflicts)
- Empty and missing pipeline directory handling
- Slug collision detection and winner selection
- Blocked feature detection
- `released` terminal state (no next action)
- Missing `phase` field fallback to structural inference
- Manifest-only anchoring (no design file dependency)
- No cost aggregation in scanner output

Tests should be structured by concern (phase transitions, conflict resolution, edge cases) and use descriptive test names that document the expected behavior.

## Acceptance Criteria

- [ ] All phase transitions tested: plan → implement → validate → release → released
- [ ] Merge conflict resolution tested: clean resolve, invalid JSON after resolve, multi-block
- [ ] Empty/missing pipeline directory tested
- [ ] Slug collision detection and warning tested
- [ ] Blocked feature detection tested
- [ ] Missing `phase` field fallback tested
- [ ] No `costUsd` in test assertions
- [ ] Tests run via `bun test` and pass
- [ ] Tests use mock filesystem, no real disk writes
