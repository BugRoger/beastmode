---
phase: plan
slug: 67acde
epic: dashboard-dispatch-fix
feature: strategy-dispatch
wave: 2
---

# Strategy Dispatch

**Design:** `.beastmode/artifacts/design/2026-04-04-67acde.md`

## User Stories

1. As a pipeline operator, I want the dashboard to dispatch phases using my configured strategy (iTerm2/cmux/sdk), so that dispatch actually works instead of silently failing.
3. As a pipeline operator, I want the broken `claude --print` CLI fallback removed, so that dispatch failures surface cleanly instead of producing zombie sessions.
6. As a pipeline operator, I want the dashboard and watch commands to use the exact same strategy selection logic, so that behavior is predictable regardless of which UI I use.

## What to Build

The dashboard command currently hardcodes `SdkSessionFactory(dispatchPhase)` and ignores the user's configured `dispatch-strategy`. Two changes are needed:

**1. Dashboard strategy selection:** The dashboard command must call `selectStrategy(config.cli["dispatch-strategy"])` — the same function the watch command uses — and wire the resulting factory (ITermSessionFactory, CmuxSessionFactory, or SdkSessionFactory) into ReconcilingFactory. The watch command already demonstrates the correct wiring pattern. The dashboard must load config via `loadConfig()` and pass the strategy through the same selection logic.

**2. Remove broken CLI fallback:** The `dispatchPhase()` function contains a catch block that falls back to `Bun.spawn("claude", "--print", ...)` when SDK import fails. This fallback produces zombie sessions and provides no streaming events. Delete the entire fallback path. When SDK import fails, the error should propagate through the session factory so the watch loop's existing error handling can catch it and retry on the next scan cycle.

**Cross-cutting constraint:** `selectStrategy()` and its availability-checking dependencies must remain in a location importable by both the dashboard and watch commands. If currently only used by watch, the import path needs to be accessible.

## Acceptance Criteria

- [ ] Dashboard calls `selectStrategy()` with the config's dispatch-strategy value
- [ ] Dashboard creates the correct factory type (SDK/cmux/iTerm2) based on strategy selection
- [ ] Dashboard wires the selected factory into ReconcilingFactory identically to watch
- [ ] The `Bun.spawn("claude", "--print", ...)` fallback in dispatchPhase() is deleted
- [ ] When SDK import fails, the error propagates (no silent fallback)
- [ ] SDK dispatch still works when explicitly configured (`dispatch-strategy: sdk`)
- [ ] Unit test: dashboard creates correct factory for each config value (sdk, cmux, iterm2, auto)
- [ ] Unit test: dispatchPhase() throws when SDK import fails (no fallback path)
