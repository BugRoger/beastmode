---
phase: plan
epic: polling-behaviour
feature: dispatch-mutex
---

# dispatch-mutex

**Design:** .beastmode/artifacts/design/2026-03-29-polling-behaviour.md

## User Stories

1. As a pipeline operator, I want the watch loop to never dispatch the same phase twice for the same epic, so that I don't get conflicting sessions fighting over the same worktree.
2. As a pipeline operator, I want concurrent completion events to queue rather than skip, so that every session completion triggers a re-scan and no advancement is lost.

## What to Build

Create a promise-based async mutex utility that serializes access to a critical section. The mutex implements a FIFO queue — `acquire()` returns a promise that resolves to a `release` function. When the mutex is free, `acquire()` resolves immediately. When held, callers queue and resolve in order when the holder calls `release()`.

Integrate the mutex into the WatchLoop class as a private field, initialized in the constructor. Both `tick()` (per-epic iteration) and `rescanEpic()` must acquire the mutex before calling `processEpic()`. The mutex wraps the entire `processEpic()` call path — including the DispatchTracker check, session creation, and tracker registration — making the check-then-act sequence atomic.

The contention model is wait/queue, not skip. A concurrent caller blocked on the mutex will eventually get its turn and re-evaluate dispatch conditions with fresh tracker state. This ensures no completion event is silently dropped.

No external dependencies. The mutex is a self-contained module with no filesystem or network I/O.

## Acceptance Criteria

- [ ] Async mutex module exists with `acquire()` → `release()` API
- [ ] Mutex enforces FIFO ordering — concurrent acquires resolve in call order
- [ ] WatchLoop owns a single mutex instance (private field)
- [ ] `tick()` acquires mutex before each `processEpic()` call
- [ ] `rescanEpic()` acquires mutex before calling `processEpic()`
- [ ] Mutex release is guaranteed even if `processEpic()` throws (try/finally)
- [ ] Existing watch tests continue to pass (mutex is transparent to serial callers)
