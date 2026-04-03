# rescanEpic Scope

## Context
The watch loop's `rescanEpic()` method rescans only the completing epic by its
slug — it does not trigger a full scan of all epics. This became apparent when a
test expected a second epic to dispatch after the first completed, but
`rescanEpic()` only re-evaluated the completed epic.

## Decision
Use `tick()` (full scan) rather than `rescanEpic()` when testing cross-epic
dispatch sequences. `rescanEpic()` is correct for single-epic state transitions
(e.g., phase advancement after completion). Cross-epic effects (e.g., unblocking
a queued release) require the next full scan tick.

## Rationale
`rescanEpic()` is an optimization for the common case — one epic finishes, its
next phase dispatches. Cross-epic coordination happens through the poll-based
scan, not through targeted rescan.

## Source
- .beastmode/artifacts/implement/2026-04-03-release-serialization-release-gate.md (Task 3 deviation)
