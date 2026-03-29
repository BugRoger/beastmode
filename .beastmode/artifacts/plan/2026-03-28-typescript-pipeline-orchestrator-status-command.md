# status-command

**Design:** .beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md
**Architectural Decisions:** see manifest

## User Stories

8. As a developer, I want `beastmode status` to show epic state and cost-to-date so that I understand pipeline progress and spend without running Claude.

## What to Build

The `beastmode status` command — a fast, purely filesystem-based state reader that displays pipeline progress. No Claude sessions are spawned.

The command uses the state scanner module to gather epic state, then reads `.beastmode-runs.json` to aggregate cost-to-date per epic. Output is a formatted terminal table showing:

- Epic name (derived from design slug)
- Current phase (design, plan, implement, validate, release, done)
- Feature progress for implement phase (e.g., "3/5 implemented")
- Blocked status (if paused on a human gate, show which gate)
- Total cost in USD (aggregated from run log)
- Last activity timestamp

The output is designed for quick scanning — one row per epic, sorted by last activity.

## Acceptance Criteria

- [ ] `beastmode status` prints a formatted epic table to stdout
- [ ] Shows current phase per epic
- [ ] Shows feature progress (completed/total) for epics in implement phase
- [ ] Shows cost-to-date per epic from `.beastmode-runs.json`
- [ ] Shows blocked status with gate name for paused epics
- [ ] Runs in under 1 second (pure filesystem reads, no Claude sessions)
- [ ] Gracefully handles missing run log or empty state directory
