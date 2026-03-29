# dispatch-abstraction

**Design:** .beastmode/state/design/2026-03-28-cmux-integration.md
**Architectural Decisions:** see manifest

## User Stories

1. US 6: As an operator without cmux installed, I want the existing SDK-based dispatch to work exactly as before so cmux is never a hard dependency

## What to Build

Extract the current inline SDK dispatch logic into a formal `DispatchedSession` interface that defines how sessions are created, tracked, and completed. Implement `SdkSession` as the first concrete implementation, wrapping the existing `dispatchPhase()` logic from `watch-command.ts` without changing any behavior.

The interface must capture:
- Session creation (dispatch a phase to a worktree)
- Completion detection (promise-based, resolves to SessionResult)
- Abort signaling (AbortController passthrough)

Introduce a `SessionFactory` that, in this feature, always returns `SdkSession`. The factory will gain cmux awareness in the `cmux-config` feature. The `WatchLoop` calls the factory instead of the inline dispatch function.

The existing `WatchDeps.dispatchPhase` signature becomes the `SessionFactory.create()` interface. The `DispatchTracker` continues to work unchanged — it tracks `DispatchedSession` objects regardless of implementation.

This is a pure refactor. All existing tests must pass. The SDK fallback-to-CLI behavior is preserved inside `SdkSession`.

## Acceptance Criteria

- [ ] `DispatchedSession` interface defined with create/complete/abort contract
- [ ] `SdkSession` wraps existing SDK + CLI fallback dispatch logic
- [ ] `SessionFactory` introduced, returns `SdkSession` unconditionally
- [ ] `WatchLoop` uses `SessionFactory` instead of inline `dispatchPhase`
- [ ] All existing watch loop and dispatch tracker tests pass unchanged
- [ ] No behavioral change observable from watch loop perspective
