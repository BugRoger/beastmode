# Implement Context

## Agents
- NEVER stash, switch branches, or modify worktrees without explicit user request
- ALWAYS verify worktree context before modifying files
- NEVER guess file paths — verify they exist first
- Commits happen naturally during implementation — release owns the squash merge

## Testing
- ALWAYS verify L2 files contain project-specific content, not placeholder patterns
- NEVER skip brownfield verification after init
- Critical paths: brownfield execution, parallel agent spawning, content merge, atomic file writes, gate structure, task-runner integration

## GitHub Integration
- ALWAYS gate GitHub sync on `github.enabled` in config.yaml — skip entirely when false or missing
- ALWAYS use warn-and-continue for gh CLI calls — print warning, skip failed op, never block local workflow
- Manifest JSON is the local authority; GitHub is a synced mirror updated only at checkpoint boundaries
- ALWAYS use `_shared/github.md` for all GitHub operations — never inline gh CLI logic
- Label taxonomy: 12 labels across type (2), phase (7), status (3), gate (1) — status/review is dropped
- Epic lifecycle: created at design checkpoint, phase-advanced at each subsequent checkpoint, closed at release
- Feature lifecycle: created as sub-issues at plan checkpoint, set in-progress at implement prime, closed at implement checkpoint

## State Scanning
- ALWAYS discover epics from manifest files — never from design files or date heuristics
- Scan artifacts/plan/ then state/ — state/ wins dedup
- ALWAYS derive phase from the manifest.phases map — no filesystem marker sniffing
- Status table: Epic, Phase, Progress, Blocked, Last Activity — no cost column
- Next action: fan-out at implement, single dispatch for all other phases, null for done epics

## Cmux Integration
- CmuxClient is a class wrapping the cmux binary via Bun.spawn with injectable SpawnFn for testability
- All operations shell out to cmux CLI with --json flag for structured responses; no direct socket programming
- Error hierarchy: CmuxError base, CmuxConnectionError, CmuxProtocolError, CmuxTimeoutError
- Close operations are idempotent — "not found" errors are swallowed, connection errors always rethrow
- No retry logic or caching in the client — callers handle retry policy

## Pipeline Machine
- Two XState v5 machines in cli/src/pipeline-machine/: epicMachine (7 states) and featureMachine (4 states)
1. ALWAYS use the setup() API — declare guards, actions, and actors in setup() before createMachine()
2. ALWAYS place assign() calls inside setup() actions with pure compute functions in actions.ts — XState v5.30 requires this for type inference
3. Every state node declares meta.dispatchType (single/fan-out/skip) — watch loop reads dispatch from state metadata
4. Services use fromPromise with injectable functions — machine stays decoupled from I/O
5. Guards are standalone pure functions checked against event payloads, not external state
6. CANCEL event must be valid from every non-terminal epic state
