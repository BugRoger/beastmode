# Worktree Subagent Change Isolation

## Observation 1
### Context
During manifest-first-scanner implementation, 2026-03-29. Three sequential tasks: Task 0 rewrote state-scanner.ts, Task 1 updated status.ts, Task 2 rewrote tests. Each dispatched as a subagent in an isolated worktree.
### Observation
Subagent worktree isolation means later sequential tasks cannot see earlier tasks' code changes. Task 2 (test rewrite) was dispatched to a subagent that had a stale view of state-scanner.ts -- it wrote tests against the old API because Task 0's rewrite hadn't propagated. The orchestrator had to rewrite the tests manually to match the actual new scanner interface. This is distinct from the parallel dispatch coordination problem: even sequential tasks with explicit ordering fail when each runs in its own worktree.
### Rationale
When tasks have API-level dependencies (Task N changes an interface, Task N+1 consumes that interface), worktree isolation breaks the contract. Either dependent tasks must run in the same worktree, or the orchestrator must merge intermediate results before dispatching dependent tasks.
### Source
.beastmode/artifacts/plan/2026-03-29-manifest-only-status-manifest-first-scanner.tasks.json
### Confidence
[LOW] -- first observation
