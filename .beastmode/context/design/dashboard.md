# Dashboard

## Framework and Rendering
- ALWAYS use Ink v6.8.0 + React for fullscreen TUI rendering — Yoga flexbox handles terminal resize natively
- ALWAYS use alternate screen buffer (`\x1b[?1049h` / `\x1b[?1049l`) for clean terminal entry and exit
- UI refresh ticks every 1 second independently of the orchestration scan interval — spinners and clock update smoothly
- Color scheme follows existing phase convention: magenta (design), blue (plan), yellow (implement), cyan (validate), green (release), dim green (done), red (blocked), dim red (cancelled)

## Layout
- Three-zone vertical stack: header (title + watch status + clock), epic table (sortable by phase lifecycle), scrolling activity log (newest at top)
- Spinners on epics/features with active sessions via Ink's built-in spinner component
- Animated progress bars for feature completion with filled segments

## Watch Loop Integration
- ALWAYS embed WatchLoop directly in the dashboard process — no separate watch process, dashboard IS the orchestrator
- ALWAYS subscribe to WatchLoop EventEmitter typed events for React state updates — same event stream that the logger subscribes to in headless mode
- ALWAYS use the same lockfile as `beastmode watch` — mutual exclusion prevents two orchestrators from running simultaneously
- ALWAYS externalize signal handling — Ink app's SIGINT handler calls `loop.stop()`, avoids conflict with Ink's own signal management

## Keyboard Navigation
- `q` / `Ctrl+C` — graceful exit: `loop.stop()` waits up to 30s for active sessions, then restores terminal
- `up` / `down` arrows — navigate epic rows in the table
- `x` — cancel selected epic with inline confirmation ("Cancel {slug}? y/n"), aborts running sessions via DispatchTracker then calls shared cancel module (`cancelEpic()` from `cancel-logic.ts`) for full ordered cleanup (worktree, branch, tags, artifacts, GitHub issue, manifest)
- `a` — toggle auto-scroll in the activity log

## Shared Data Module
- ALWAYS use `status-data.ts` for sorting, filtering, snapshot building, and change detection — shared between `beastmode status` and `beastmode dashboard`
- status.ts retains its ANSI string rendering; dashboard uses Ink components for rendering — data layer shared, presentation layer separate

## Coexistence
- NEVER replace `beastmode watch` — kept as headless fallback for CI/automation
- NEVER replace `beastmode status` or `status --watch` — kept for quick passive viewing
- Dashboard is an additive capability, not a replacement for existing commands
