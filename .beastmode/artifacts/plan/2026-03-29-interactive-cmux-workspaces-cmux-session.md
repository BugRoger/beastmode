# cmux-session

**Design:** .beastmode/state/design/2026-03-29-interactive-cmux-workspaces.md
**Architectural Decisions:** see manifest

## User Stories

1. US 1: As an operator running `beastmode watch`, I want each dispatched agent to appear in its own cmux terminal pane so I can visually monitor all parallel workers at a glance
2. US 2: As an operator, I want agents grouped by epic in cmux workspaces so I can focus on one epic's progress without distraction from others

## What to Build

A `CmuxSession` class implementing the `DispatchedSession` interface from the dispatch-abstraction feature. This is the cmux-aware dispatch strategy that creates real terminal surfaces for agents.

**Session creation flow:**
1. Ensure a cmux workspace exists for the epic (create if missing, reuse if present)
2. Create a surface within that workspace, named after the phase/feature
3. Send `beastmode run <phase> <slug>` as text into the surface — cmux owns the shell process
4. Return a `DispatchedSession` with a promise that resolves when the run completes

**Completion detection:**
- The existing `.beastmode-runs.json` polling mechanism detects completion. `CmuxSession` does not add new polling — it relies on the watch loop's existing tick to check runs.json.
- The session promise resolves when a matching run entry appears in runs.json for this epic/phase/feature.

**Abort handling:**
- On abort signal, close the cmux surface (which kills the shell process). The run entry will show as cancelled.

**Workspace naming convention:** Epic slug as workspace name (e.g., `interactive-cmux-workspaces`).
**Surface naming convention:** `<phase>` for single dispatch, `<phase>-<feature-slug>` for fan-out.

Uses `CmuxClient` from the cmux-client feature for all cmux communication. Has no direct socket knowledge.

## Acceptance Criteria

- [ ] `CmuxSession` implements `DispatchedSession` interface
- [ ] Creates workspace per epic on first dispatch (idempotent)
- [ ] Creates surface per phase/feature within the workspace
- [ ] Sends `beastmode run` command into surface via send-text
- [ ] Session promise resolves when matching runs.json entry appears
- [ ] Abort closes the cmux surface
- [ ] Integration tests covering full lifecycle: create → dispatch → complete → cleanup
