---
phase: plan
slug: 67acde
epic: dashboard-dispatch-fix
feature: integration-tests
wave: 1
---

# Integration Tests

**Design:** `.beastmode/artifacts/design/2026-04-04-67acde.md`

## User Stories

1. As a pipeline operator, I want the dashboard to dispatch phases using my configured strategy (iTerm2/cmux/sdk), so that dispatch actually works instead of silently failing.
2. As a pipeline operator, I want the dashboard log panel to show event-based status (dispatching, completed, failed) when SDK streaming isn't available, so that I still have visibility into pipeline progress.
3. As a pipeline operator, I want the broken `claude --print` CLI fallback removed, so that dispatch failures surface cleanly instead of producing zombie sessions.
4. As a pipeline operator, I want to press `v` in the dashboard to cycle through log verbosity levels (info -> detail -> debug -> trace), so that I can adjust log detail at runtime without restarting.
5. As a pipeline operator, I want the dashboard to show the current log verbosity level in the key hints bar, so that I know what level I'm viewing.
6. As a pipeline operator, I want the dashboard and watch commands to use the exact same strategy selection logic, so that behavior is predictable regardless of which UI I use.

## What to Build

Write Gherkin `.feature` files and corresponding step definitions for all 22 scenarios specified in the integration artifact at `.beastmode/artifacts/plan/2026-04-04-dashboard-dispatch-fix-integration.md`. The scenarios cover six behavioral areas:

- Dashboard dispatch strategy selection (4 scenarios including outline with 3 examples)
- Event-based log panel status (4 scenarios covering dispatching/completed/failed/lifecycle)
- CLI fallback removal (3 scenarios: no fallback attempted, no zombies, clear error)
- Log verbosity cycling (4 scenarios: default, cycle outline with 4 examples, immediate effect, filtering)
- Verbosity indicator in key hints bar (3 scenarios: default display, update on change, shortcut hint)
- Unified strategy selection across dashboard and watch (4 scenarios including outline with 3 examples)

Scenarios are strictly declarative — no file paths, API endpoints, or DOM references. Step definitions wire to the application's dispatch and rendering modules.

## Acceptance Criteria

- [ ] All 22 Gherkin scenarios from the integration artifact exist as `.feature` files
- [ ] Step definitions are implemented for all Given/When/Then steps
- [ ] Test runner is configured and all scenarios execute (pass or pending)
- [ ] Scenarios are tagged with `@dashboard-dispatch-fix`
