# run-command

**Design:** .beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md
**Architectural Decisions:** see manifest

## User Stories

1. As a developer, I want to run `beastmode run plan foo` so that a single phase executes in a worktree with streaming output, replacing `just plan foo`.

## What to Build

The `beastmode run <phase> <args>` command implementation. The command:

1. Creates a worktree via the worktree manager module
2. Spawns a Claude Agent SDK session pointed at the worktree's `cwd`
3. Invokes the phase skill via `query()` with the prompt `/beastmode:<phase> <args>`, `settingSources: ['project']`, `allowedTools`, and `permissionMode: 'bypassPermissions'`
4. Streams SDK messages to the terminal in real time
5. On completion, logs run metadata (epic, phase, feature, cost_usd, duration_ms, exit_status, timestamp) to `.beastmode-runs.json`

**Design phase exception:** `beastmode run design <topic>` spawns an interactive `claude` process via `Bun.spawn` with inherited stdio (stdin/stdout/stderr) instead of using the SDK, because design requires human interaction.

**Cancellation:** An `AbortController` is wired to the process's SIGINT handler so that Ctrl+C cleanly cancels the SDK session.

## Acceptance Criteria

- [ ] `beastmode run plan foo` creates worktree, runs `/beastmode:plan foo` via SDK with streaming output
- [ ] `beastmode run design "some topic"` spawns interactive claude with inherited stdio
- [ ] Ctrl+C cancels the SDK session cleanly via AbortController
- [ ] Run metadata (cost, duration, exit status) appended to `.beastmode-runs.json` on completion
- [ ] Exit code reflects phase success (0) or failure (non-zero)
- [ ] SDK session configured with `settingSources: ['project']` and `permissionMode: 'bypassPermissions'`
