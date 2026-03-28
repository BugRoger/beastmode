# watch-loop

**Design:** .beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md
**Architectural Decisions:** see manifest

## User Stories

2. As a developer, I want to run `beastmode watch` so that all epics with completed designs are automatically driven through plan -> release without manual phase invocations.
3. As a developer, I want the watch loop to dispatch multiple epics in parallel so that features across epics don't queue behind each other.
4. As a developer, I want implement-phase work to fan out one Claude session per feature so that features within an epic are built in parallel.
6. As a developer, I want the watch loop to immediately re-scan an epic when a phase completes so that epics progress through phases in minutes, not poll cycles.
7. As a developer, I want the watch loop to pause an epic and notify me when it hits a human gate so that I retain control over decisions I marked as requiring human judgment.

## What to Build

The `beastmode watch` command — a foreground process (Ctrl+C to stop) that autonomously drives all epics through the beastmode pipeline.

**Core loop:**
- Poll interval: 60 seconds (configurable via `cli.interval` in config.yaml)
- Each tick: run the state scanner, compare against currently dispatched sessions, dispatch new sessions for any epic with an actionable next step
- Event-driven re-scan: when any SDK session completes, immediately re-scan that epic's state and dispatch the next phase (poll is the safety net, not the primary driver)

**Concurrency model:**
- No concurrency cap — parallel epics, parallel features within implement phase
- Each dispatch creates its own worktree and SDK session
- API rate limits serve as the natural governor

**Implement fan-out:** When the state scanner reports `next-action: implement` with multiple pending features, dispatch one SDK session per feature simultaneously. Each feature gets its own worktree (same design branch, different feature work).

**Human gate handling:** When the state scanner detects an epic blocked on a human gate, the watch loop pauses that epic (no dispatch), logs the gate information to stdout, and continues processing other epics. The developer runs `beastmode run <phase> <slug>` manually to clear the gate.

**Lockfile:** `cli/.beastmode-watch.lock` prevents duplicate watch instances. Created on start, removed on clean shutdown. Stale lockfile detection (check if PID in lockfile is still running).

**Recovery on startup:** Scan for existing worktrees with uncommitted changes. Re-dispatch from last committed state rather than starting fresh.

**Graceful shutdown:** SIGINT handler waits for active SDK sessions to complete (with a timeout), then cleans up.

## Acceptance Criteria

- [ ] Watch starts, scans state, and dispatches sessions for ready epics
- [ ] Multiple epics run their phases in parallel (no queuing)
- [ ] Implement phase fans out one session per pending feature
- [ ] Phase completion triggers immediate re-scan of that epic (not waiting for poll interval)
- [ ] Human gates pause the epic with clear stdout notification including gate name and epic
- [ ] Lockfile prevents duplicate watch processes; stale lockfile detection works
- [ ] Ctrl+C initiates graceful shutdown (waits for sessions, then exits)
- [ ] Recovery on startup re-dispatches from last committed state for existing worktrees
- [ ] Poll interval is configurable via `cli.interval` in config.yaml
