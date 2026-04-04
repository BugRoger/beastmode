---
phase: plan
slug: dashboard-wiring
epic: dashboard-wiring
feature: integration-test
wave: 2
---

# Integration Test

**Design:** `.beastmode/artifacts/design/2026-04-04-dashboard-wiring.md`

## User Stories

3. As a developer, I want an integration test that verifies App renders ThreePanelLayout and that epic selection propagates to details and log panels, so that the wiring is validated end-to-end.

## What to Build

**Integration test file:** A new test file in the existing test directory that renders the full App component with mock data and verifies the three-panel wiring end-to-end. The test uses Ink's testing utilities following the patterns established by existing panel tests.

**Wiring verification:** The test renders App with a mock WatchLoop (or minimal props) and mock epic data, then asserts that ThreePanelLayout is instantiated as the top-level layout. It verifies that EpicsPanel, DetailsPanel, and LogPanel appear as rendered children.

**Selection propagation:** The test simulates epic selection (via keyboard input or direct state manipulation) and verifies that the selected epic's data appears in both DetailsPanel and LogPanel output. This confirms the state threading from App.tsx through to the slot children.

**Keyboard test rewrite:** The existing keyboard-nav.test.ts exercises old hooks (view-stack navigation, old cancel flow state transitions). Remove test cases that reference deleted hooks or view-stack navigation. Preserve cancelEpicAction tests — that logic survives the transition. Add or adapt tests for use-dashboard-keyboard's flat navigation model if not already covered by existing tests.

## Acceptance Criteria

- [ ] Integration test file exists in cli/src/__tests__/
- [ ] Test renders App and verifies ThreePanelLayout is the top-level layout component
- [ ] Test verifies epic selection propagates to details and log panels
- [ ] keyboard-nav.test.ts no longer references deleted hooks or view-stack
- [ ] cancelEpicAction tests preserved and passing
- [ ] All tests pass: existing panel tests + new integration test + rewritten keyboard tests
