# Pipeline Orchestration

## Execution Model
- ALWAYS use `beastmode watch` as the pipeline entry point — foreground process, Ctrl+C to stop
- ALWAYS scan manifest files to determine next action per epic — state-scanner.ts reads manifest.phase for epic phase, manifests are the authority
- NEVER orchestrate the design phase — design is interactive and requires human collaboration
- Orchestrator picks up epics with a design artifact but no release artifact — scope is plan through release only
- Event-driven re-scan on session completion — 60-second poll interval (configurable via `cli.interval`) is the safety net
- No concurrency cap — parallel epics, parallel features within epics, API rate limits are the natural governor

## Agent Dispatching
- ALWAYS dispatch one session per phase per epic via `SessionStrategy` interface, except implement which fans out one session per feature — parallelism at every level
- ALWAYS use CLI-owned worktrees for agent isolation — CLI creates worktree, points session at it via `cwd`, merges after completion, removes when done
- `SdkStrategy` invokes via SDK `query()` with prompt invoking the skill, `permissionMode: 'bypassPermissions'` — typed session management with streaming
- `CmuxStrategy` creates a cmux terminal surface and sends `beastmode <phase> <slug>` via `cmux send-surface` — CLI-in-surface execution model
- `SessionFactory` returns `CmuxStrategy` when `cli.dispatch-strategy` config enables it and cmux is available, `SdkStrategy` otherwise — strategy pattern with automatic fallback
- Completion detection via `.dispatch-done.json` marker file — `phaseCommand` always writes it on exit, each strategy detects it per its own mechanism (SDK resolves promise + writes marker, cmux watches via `fs.watch`)

## Merge Strategy
- ALWAYS merge implement worktrees sequentially after all agents for an epic finish — ordering prevents conflicts
- ALWAYS run pre-merge conflict simulation via `git merge-tree` to determine optimal merge order — avoids preventable conflicts
- ALWAYS verify manifest completeness after merging — all features must show completed
- When merge conflicts arise, spawn a dedicated Claude session to resolve — automated conflict resolution

## Gate Handling
- ALWAYS respect config.yaml gate settings during orchestration — human gates still pause
- When a gate is `human`, epic pauses and logs to stdout — user runs `beastmode <phase> <slug>` manually to proceed

## Recovery
- State files are the recovery point, not sessions — on startup, scan for existing worktrees with uncommitted changes
- ALWAYS re-dispatch from last committed state on recovery — no session persistence required
- Lockfile (`cli/.beastmode-watch.lock`) prevents duplicate watch instances — single orchestrator guarantee
- ALWAYS reconcile cmux state on startup — query cmux for existing workspaces matching known epic slugs, adopt live surfaces, close dead ones, remove empty workspaces

## Lifecycle
- Start via `beastmode watch`, stop via Ctrl+C — foreground process with explicit control
- NEVER auto-drain or idle-timeout — manual stop only
- Per-dispatch run log in `.beastmode-runs.json` — epic, phase, feature, cost_usd, duration_ms, exit_status, timestamp
