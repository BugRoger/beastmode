## Problem Statement

Beastmode features are driven one at a time in single sessions. There is no way to coordinate multiple epics moving through the pipeline simultaneously, and no mechanism to automatically advance epics through phases after design is complete.

## Solution

A `/beastmode orchestrate` subcommand that runs a CronCreate poll loop (1-minute interval), scans local state files for actionable epics, and spawns worktree-isolated agents to drive them through plan -> implement -> validate -> release in parallel. One team per epic, one agent per phase (except implement, which fans out per-feature). The orchestrator respects config.yaml gates and relays blocked agents to the user.

## User Stories

1. As a developer, I want to run `/beastmode orchestrate` so that all epics with completed designs are automatically driven through plan -> release without manual phase invocations.
2. As a developer, I want the orchestrator to process multiple epics in parallel so that features don't queue behind each other.
3. As a developer, I want implement-phase work to fan out one agent per feature so that features within an epic are built in parallel.
4. As a developer, I want the orchestrator to respect config.yaml gate settings so that human-gated steps still pause for my input via message relay.
5. As a developer, I want the orchestrator to merge parallel implement worktrees sequentially and verify manifest completeness before advancing to validate, so that no feature work is lost.
6. As a developer, I want to stop the orchestrator with `/beastmode orchestrate stop` so that I can regain manual control at any time.
7. As a developer, I want the orchestrator to auto-resolve merge conflicts via a dedicated agent so that parallel implementers don't block the pipeline on trivial conflicts.

## Implementation Decisions

- Subcommand: `/beastmode orchestrate [start|stop]` added to the beastmode skill router
- Execution model: CronCreate recurring poll loop at 1-minute interval; manual stop only (no auto-drain)
- State detection: Reuses `status` subcommand logic — scans `.beastmode/state/` directories and worktree manifests. Local files are the authority; GitHub labels are not read for orchestration decisions
- Phase scope: Plan through release only. Design must be done manually. The orchestrator picks up epics that have a design artifact but no release artifact
- State machine: For each epic, determine next action by checking state files (design exists → spawn planner; manifest exists with pending features → spawn implementers; all features complete → spawn validator; validation exists → spawn releaser; release exists → skip)
- Agent spawning: One agent per phase per epic, except implement gets one agent per feature. Agents use `isolation: "worktree"`, `mode: "bypassPermissions"`, `run_in_background: true`
- Agent prompts: Each agent gets a role prompt, claims its task, invokes the appropriate skill via `Skill` tool, and messages the team lead with results
- Team organization: One team per epic (team name: `pipeline-<epic-slug>`). Created when epic first needs work, cleaned up when epic reaches release
- Worktree isolation: Agent-level via `isolation: "worktree"` on Agent tool. Skills inside agents detect they're already in a worktree and skip their own worktree creation
- Gate handling: Config.yaml gates are respected as-is. If a gate is `human`, the agent blocks and messages the orchestrator, which relays to the user
- Manifest convergence: After all implement agents for an epic finish, the orchestrator merges their worktrees to the feature branch sequentially, then verifies the manifest shows all features completed. If merge conflicts arise, a conflict-resolution agent is spawned to auto-resolve
- Concurrency: Full parallel across epics, no cap
- Poll lifecycle: CronCreate with `recurring: true`, stopped only by explicit `/beastmode orchestrate stop` which calls CronDelete

## Testing Decisions

- Test the state machine logic: given a set of state files, verify the correct next action is derived for each epic
- Test agent prompt construction: verify correct skill name and args are passed for each phase
- Test convergence: verify manifest completeness check after parallel implement merges
- Prior art: The existing `status` subcommand tests the same state scanning logic; convergence testing mirrors the merge-then-verify pattern from the prior art document

## Out of Scope

- Autonomous pipeline daemon (always-running background service outside of Claude Code sessions)
- Driving the design phase (interactive by nature, requires human collaboration)
- GitHub label-based state detection (local files are the authority)
- Concurrency caps or rate limiting on agent spawns
- Auto-drain/idle-timeout shutdown (manual stop only)
- Crash recovery for orphaned agents (deferred — CronCreate jobs are session-scoped anyway)

## Further Notes

- The double-worktree problem (Agent tool creates worktree, skill also wants to create worktree) needs to be handled: skills must detect existing worktree and skip their own creation
- CronCreate jobs are session-scoped and expire after 7 days — the orchestrator naturally stops if the session ends
- The prior art document (Pipeline Orchestrator guide in memory) informed several decisions and should be updated to reflect this PRD

## Deferred Ideas

- Crash recovery / orphaned agent cleanup as a separate `/beastmode orchestrate recover` subcommand
- Configurable concurrency caps for resource-constrained environments
- GitHub webhook-triggered orchestration (replace polling with event-driven triggers)
- Design-phase orchestration with autonomous decision-making (all gates forced to auto)
