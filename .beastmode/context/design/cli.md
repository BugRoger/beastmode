# CLI Architecture

## Command Structure
- CLI name: `beastmode` with three commands: `run <phase> <args>`, `watch`, `status`
- `beastmode run` executes a single phase in a CLI-owned worktree with streaming output
- `beastmode watch` runs the autonomous pipeline loop as a foreground process
- `beastmode status` shows epic state and cost-to-date without running Claude
- Design phase exception: `beastmode run design` spawns interactive Claude via `Bun.spawn` with inherited stdio — not the SDK

## SDK Integration
- ALWAYS use `@anthropic-ai/claude-agent-sdk` for non-interactive phase execution — typed session management, streaming, cost tracking
- Phase invocation via SDK `query()` with `prompt: "/beastmode:<phase> <args>"`, `settingSources: ['project']`, `permissionMode: 'bypassPermissions'`
- AbortController for cancellation — clean shutdown on Ctrl+C
- SDK spawns `claude` CLI as subprocess — same process model as Justfile but with typed streaming

## Worktree Lifecycle
- CLI owns full worktree lifecycle: create before session, point SDK at it via `cwd`, merge after completion, remove when done
- Branch detection rewritten in TypeScript — `feature/<slug>` branch reuse or creation from origin/HEAD
- Shell hook (`hooks/worktree-create.sh`) removed — functionality absorbed into CLI

## Configuration
- ALWAYS reuse `.beastmode/config.yaml` with new `cli:` section — no separate config file
- `cli.interval` controls poll interval (default 60 seconds)
- Gates and other config sections are unchanged

## Cost Tracking
- Per-dispatch run log appended to `.beastmode-runs.json` — epic, phase, feature, cost_usd, duration_ms, exit_status, timestamp
- `beastmode status` reads run log for cost-to-date reporting

## Recovery Model
- State files are the recovery point, not sessions — stateless session model
- On startup, scan for existing worktrees with uncommitted changes and re-dispatch from last committed state
- Lockfile (`cli/.beastmode-watch.lock`) prevents duplicate watch instances
