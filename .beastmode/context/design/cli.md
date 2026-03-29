# CLI Architecture

## Command Structure
- CLI name: `beastmode` with phase commands as direct arguments: `<phase> <slug>`, plus `watch` and `status`
- `beastmode <phase> <slug>` executes a single phase in a CLI-owned worktree with streaming output — `run` subcommand is dropped
- `beastmode watch` runs the autonomous pipeline loop as a foreground process
- `beastmode status` shows epic state and cost-to-date without running Claude
- Design phase exception: `beastmode design <topic>` spawns interactive Claude via `Bun.spawn` with inherited stdio — not the SDK

## Dispatch Abstraction
- ALWAYS use `DispatchedSession` interface for phase dispatch — strategy pattern decouples dispatch mechanism from orchestration logic
- `SdkSession`: uses `@anthropic-ai/claude-agent-sdk` `query()` with `prompt: "/beastmode:<phase> <args>"`, `settingSources: ['project']`, `permissionMode: 'bypassPermissions'` — typed session management, streaming, cost tracking
- `CmuxSession`: creates cmux terminal surface via JSON-RPC over Unix socket, sends `beastmode <phase> <slug>` via `surface.send-text` — cmux owns the shell process, agents get full interactive terminal capability
- `SessionFactory` reads config + runtime state (cmux availability) to return the right session type — `auto` mode checks socket + ping
- AbortController for cancellation — clean shutdown on Ctrl+C
- Design phase exception: `beastmode design <topic>` always spawns interactive Claude via `Bun.spawn` with inherited stdio — not dispatched through `SessionFactory`

## Worktree Lifecycle
- CLI owns full worktree lifecycle: create at first phase encounter, persist through all intermediate phases, squash-merge to main and remove at release
- Branch detection rewritten in TypeScript — `feature/<slug>` branch reuse or creation from origin/HEAD
- Shell hook (`hooks/worktree-create.sh`) deleted — functionality absorbed into CLI
- Justfile deleted entirely — CLI is the sole orchestration layer
- Error recovery: failed phases leave worktree dirty, next run picks up and overwrites

## Configuration
- ALWAYS reuse `.beastmode/config.yaml` with `cli:` and `cmux:` sections — no separate config file
- `cli.interval` controls poll interval (default 60 seconds)
- `cmux.enabled` controls cmux integration (auto/true/false) — `auto` checks socket availability at runtime
- `cmux.notifications` controls notification verbosity (errors/phase-complete/full) — errors and blocks only by default
- `cmux.cleanup` controls surface cleanup timing (on-release/manual/immediate) — on-release mirrors worktree lifecycle
- Gates and other config sections are unchanged

## Cost Tracking
- Per-dispatch run log appended to `.beastmode-runs.json` — epic, phase, feature, cost_usd, duration_ms, exit_status, timestamp
- `beastmode status` reads run log for cost-to-date reporting

## Recovery Model
- State files are the recovery point, not sessions — stateless session model
- On startup, scan for existing worktrees with uncommitted changes and re-dispatch from last committed state
- Lockfile (`cli/.beastmode-watch.lock`) prevents duplicate watch instances

## Manifest Lifecycle
- CLI creates manifest at first phase dispatch (design) with slug, phase, and worktree info
- ALWAYS enrich manifest from phase output files after each dispatch — CLI reads `state/<phase>/YYYY-MM-DD-<slug>.output.json`
- CLI is the sole manifest mutator — skills never read or write the manifest
- Manifest location: `.beastmode/pipeline/<slug>/manifest.json` — local-only, gitignored
- ALWAYS rebuild manifest from worktree branch scanning on cold start — no persistent dependency on manifest file

## Post-Dispatch Pipeline
- After every phase dispatch: read phase output from worktree `state/`, update manifest (advance phase, record artifacts, update feature statuses), run `syncGitHub(manifest, config)`
- Same code path for manual `beastmode <phase>` and watch loop dispatch — no separate sync logic
- ALWAYS use post-only stateless sync — no pre-sync, no phase parameter, function reads manifest and makes GitHub match

## Phase Output Contract
- Skills write structured output to `state/<phase>/YYYY-MM-DD-<slug>.output.json` at checkpoint
- Universal schema: `{ "status": "completed", "artifacts": { ... } }` — features listed in artifacts
- Output files committed on feature branch alongside skill artifacts — audit trail
- CLI reads output files from the worktree's `state/` directory after dispatch
