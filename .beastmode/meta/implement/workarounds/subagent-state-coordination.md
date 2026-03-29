# Subagent State Coordination

## Observation 1
### Context
During meta-retro-rework implementation, 2026-03-07. Five parallel subagents dispatched for migration tasks.
### Observation
Subagents completed their work but did not update the central tasks.json. The controller had to reconcile task status post-hoc from filesystem evidence and agent return values. There is no reliable mechanism for subagents to write back to a shared coordination file.
### Rationale
Parallel dispatch currently has a coordination gap: subagents can read the plan but cannot reliably signal completion to a shared state file. Controllers must design for post-hoc reconciliation rather than real-time status updates.
### Source
state/plan/2026-03-07-meta-retro-rework.md
### Confidence
[LOW] — first observation

## Observation 2
### Context
During manifest-first-scanner implementation, 2026-03-29. Subagents dispatched in worktree isolation for sequential tasks.
### Observation
Subagent changes did not persist to the main worktree. The orchestrator expected Task 0's rewrite of state-scanner.ts to be visible for subsequent tasks, but worktree isolation meant each subagent worked against a stale codebase snapshot. The orchestrator had to apply the scanner rewrite directly in the parent worktree. This extends the coordination gap beyond status files -- even code artifacts don't flow back automatically.
### Rationale
Worktree isolation affects both state coordination (Observation 1) and code artifact flow. Post-hoc reconciliation must cover code changes, not just status tracking. For sequential tasks with dependencies, the orchestrator must merge or cherry-pick between dispatches.
### Source
.beastmode/artifacts/plan/2026-03-29-manifest-only-status-manifest-first-scanner.tasks.json
### Confidence
[MEDIUM] -- second observation, extends Observation 1 to code artifacts
