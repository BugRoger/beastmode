# Pipeline Orchestration

## Execution Model
- ALWAYS use the dashboard's embedded WatchLoop as the pipeline entry point — `beastmode dashboard` is the sole pipeline UI
- ALWAYS scan manifest files to determine next action per epic — state-scanner.ts reads manifest.phase for epic phase, manifests are the authority
- NEVER orchestrate the design phase — design is interactive and requires human collaboration
- Orchestrator picks up epics with a design artifact but no release artifact — scope is plan through release only
- Event-driven re-scan on session completion — 60-second poll interval (configurable via `cli.interval`) is the safety net
- ALWAYS auto-regress from validate to implement on failure via generic REGRESS event — replaces hardcoded VALIDATE_FAILED, no confirmation prompt in automated mode
- ALWAYS use WatchLoop EventEmitter with typed events (`scan-complete`, `scan-started`, `session-started`, `session-completed`, `error`, `stopped`, `release:held`, `session-dead`) for state communication — logger subscriber and React hooks for dashboard; `scan-started` fires at the beginning of each scan cycle before any session dispatching; `scan-complete` carries `trigger: "poll" | "event"` to distinguish scheduled interval ticks from session-completion-driven rescans (poll resets the countdown timer; event-triggered does not)
- ALWAYS externalize signal handling from WatchLoop — dashboard owns SIGINT/SIGTERM and calls `loop.stop()` for graceful shutdown
- No concurrency cap except release phase — parallel epics, parallel features within epics, terminal processes are the natural governor; release phase is serialized to one-at-a-time to prevent merge conflicts on main
- ALWAYS sync GitHub inside reconcileState() via syncGitHubForEpic() — single load-save cycle per epic, no TOCTOU window between reconciliation and sync; sync failures warn and continue without blocking the pipeline
- ALWAYS use per-epic scoped logger instances via `createLogger(verbosity, epicSlug)` — system-level messages (startup, shutdown) use `beastmode` as slug prefix

## Agent Dispatching
- ALWAYS dispatch one session per phase per epic via `SessionFactory` interface, except implement which fans out one session per feature — parallelism at every level
- ALWAYS use CLI-owned worktrees for agent isolation — CLI creates worktree, points session at it via `cwd`, merges after completion, removes when done
- ITermSessionFactory is the sole implementation — creates iTerm2 terminal tabs and sends `beastmode <phase> <slug>` for execution
- Completion detection via output.json — Stop hook generates it from artifact frontmatter on session exit; factory watches `artifacts/<phase>/` for `*.output.json` via `fs.watch`

## Merge Strategy
- Parallel feature agents commit directly to the shared feature branch -- no post-implementation merge step
- Wave file isolation guarantees disjoint file sets across parallel agents -- git index.lock serializes concurrent commits
- ALWAYS verify store completeness after all features complete -- all features must show completed
- When merge conflicts arise, spawn a dedicated Claude session to resolve — automated conflict resolution

## Recovery
- State files are the recovery point, not sessions — on startup, scan for existing worktrees with uncommitted changes
- ALWAYS re-dispatch from last committed state on recovery — no session persistence required
- Lockfile (`.beastmode/.beastmode-watch.lock`) prevents duplicate watch instances — single orchestrator guarantee

## Lifecycle
- Start via `beastmode dashboard`, stop via Ctrl+C — foreground process with explicit control
- NEVER auto-drain or idle-timeout — manual stop only

## Decorator Forwarding
- ALWAYS forward optional interface methods through decorator/proxy factories — silent contract gaps when new optional methods are added to inner factories but the wrapping factory doesn't forward them
- Interface contract gaps are invisible at compile time for optional methods — only manifest at runtime when the lifecycle event fires

context/design/orchestration/decorator-forwarding.md

## Graceful Shutdown
- NEVER add `process.exit()` to the WatchLoop shutdown path — dashboard mode requires natural event loop drain; process.exit masks unresolved drains
- ALWAYS follow the five-step stop() sequence: abort tick controller, abort+wait sessions (5s), release lock, emit stopped, removeAllListeners
- ALWAYS scope async work cancellability to the tick via a per-tick AbortController stored on the WatchLoop instance
- ALWAYS call `removeAllListeners()` after emitting `stopped` — late-firing EventEmitter events from React subscribers will spawn new async work if listeners remain

context/design/orchestration/watchloop-shutdown-sequence.md
