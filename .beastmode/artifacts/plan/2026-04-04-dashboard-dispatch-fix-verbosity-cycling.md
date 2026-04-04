---
phase: plan
slug: 67acde
epic: dashboard-dispatch-fix
feature: verbosity-cycling
wave: 3
---

# Verbosity Cycling

**Design:** `.beastmode/artifacts/design/2026-04-04-67acde.md`

## User Stories

4. As a pipeline operator, I want to press `v` in the dashboard to cycle through log verbosity levels (info -> detail -> debug -> trace), so that I can adjust log detail at runtime without restarting.
5. As a pipeline operator, I want the dashboard to show the current log verbosity level in the key hints bar, so that I know what level I'm viewing.

## What to Build

Add runtime log verbosity cycling to the dashboard via a `v` keypress. The four verbosity levels already exist in the tree type system (info, detail, debug, trace). Three components need changes:

**1. Verbosity state:** A React state variable in the main App component, initialized from the CLI-provided verbosity arg. On each `v` keypress, the state cycles through 0 (info) -> 1 (detail) -> 2 (debug) -> 3 (trace) -> 0 (wrap).

**2. Log entry filtering:** The LogPanel and/or TreeView components filter entries at render time based on the current verbosity level. Entries with a level numerically greater than the current verbosity are hidden. Entries remain in the ring buffer so they appear immediately when verbosity increases — no data loss.

**3. Key hints bar update:** The key hints bar (rendered in normal mode) adds a verbosity indicator showing the current level: `v verb:info` / `v verb:detail` / `v verb:debug` / `v verb:trace`. This updates reactively when the verbosity state changes.

**Cross-cutting constraint:** The keyboard handler must be extended to recognize `v`/`V` in normal mode (not in filter or confirm mode). The existing input priority system already handles mode-based key routing.

## Acceptance Criteria

- [ ] Pressing `v` cycles verbosity: info -> detail -> debug -> trace -> info
- [ ] Initial verbosity matches the CLI-provided verbosity arg
- [ ] Log entries with level above current verbosity are hidden
- [ ] Hidden entries reappear when verbosity increases (no data loss)
- [ ] Key hints bar shows current verbosity level (e.g., `v verb:info`)
- [ ] Verbosity indicator updates immediately on keypress
- [ ] `v` key is ignored in filter mode and confirm mode
- [ ] Unit test: verbosity state cycles correctly (0->1->2->3->0)
- [ ] Unit test: log entry filtering at each verbosity level
