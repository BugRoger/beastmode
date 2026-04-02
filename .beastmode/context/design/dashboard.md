# Dashboard

## Framework and Rendering
- ALWAYS use Ink v6.8.0 + React for fullscreen TUI rendering — Yoga flexbox handles terminal resize natively
- ALWAYS use alternate screen buffer (`\x1b[?1049h` / `\x1b[?1049l`) for clean terminal entry and exit
- UI refresh ticks every 1 second independently of the orchestration scan interval — spinners and clock update smoothly
- Color scheme follows existing phase convention: magenta (design), blue (plan), yellow (implement), cyan (validate), green (release), dim green (done), red (blocked), dim red (cancelled)

## Layout
- Five-zone chrome: header (title + watch status + clock), breadcrumb bar, content area, activity log, key hints bar
- Content area renders one view at a time — full-screen replace model (k9s), not split pane (lazygit)
- Activity log persists at every drill-down level as a pipeline heartbeat
- Spinners on epics/features with active sessions via Ink's built-in spinner component
- Animated progress bars for feature completion with filled segments

## View Stack
- Three view types: EpicList (epic table), FeatureList (feature statuses for one epic), AgentLog (live structured log for one agent session)
- ALWAYS use push/pop stack for navigation — Enter pushes, Escape pops, Escape at root is a no-op
- Only one view renders in the content area at a time — stack depth determines breadcrumb content
- Breadcrumb bar format: `epics > <epic-name> > <feature-name>` — active (rightmost) crumb highlighted

## SDK Dispatch Override
- ALWAYS force SDK dispatch strategy when dashboard is running — dashboard requires SDK message streams, iTerm2 and cmux sessions have no stream to tap
- This is a runtime override, not a config change — `cli.dispatch-strategy` setting is ignored while the dashboard is active

## Message Mapper
- Structured message mapper converts SDKMessage types into terminal-friendly log entries (~200 lines)
- Text deltas stream inline; tool calls render as one-liners: `[Read] file.ts`, `[Edit] file.ts:45-60`, `[Bash] bun test`
- Tool results show brief output (e.g., `> 3 tests passed`)
- Inspired by PostHog/code's `sdk-to-acp.ts` conversion pattern, adapted for terminal rendering

## Ring Buffer
- ALWAYS allocate a ring buffer per dispatched SDK session (~100 recent log entries)
- Buffers collect continuously even when the user is viewing a different session — no subscribe-on-demand gaps
- Navigating to any session shows buffer contents immediately

## Context-Sensitive Key Hints
- Each view type exports its own key hint set rendered in the bottom bar
- EpicList: `q quit ↑↓ navigate ↵ drill x cancel a all`
- FeatureList: `q quit ↑↓ navigate ↵ drill ⎋ back`
- AgentLog: `q quit ↑↓ scroll ⎋ back f follow`

## Watch Loop Integration
- ALWAYS embed WatchLoop directly in the dashboard process — no separate watch process, dashboard IS the orchestrator
- ALWAYS subscribe to WatchLoop EventEmitter typed events for React state updates — same event stream that the logger subscribes to in headless mode
- ALWAYS use the same lockfile as `beastmode watch` — mutual exclusion prevents two orchestrators from running simultaneously
- ALWAYS externalize signal handling — Ink app's SIGINT handler calls `loop.stop()`, avoids conflict with Ink's own signal management

## Keyboard Navigation
- `q` / `Ctrl+C` — graceful exit: `loop.stop()` waits up to 30s for active sessions, then restores terminal
- `up` / `down` arrows — navigate rows in the current view (epics, features, or log lines)
- `Enter` — drill down from EpicList to FeatureList, or from FeatureList to AgentLog
- `Escape` — pop back to the previous view; no-op at root (EpicList)
- `x` — cancel selected epic with inline confirmation ("Cancel {slug}? y/n"), aborts running sessions via DispatchTracker then calls shared cancel module (`cancelEpic()` from `cancel-logic.ts`) for full ordered cleanup (worktree, branch, tags, artifacts, GitHub issue, manifest)
- `a` — toggle auto-scroll in the activity log
- `f` — toggle follow mode in AgentLog (auto-scroll to latest entry)

## Shared Data Module
- ALWAYS use `status-data.ts` for sorting, filtering, snapshot building, and change detection — shared between `beastmode status` and `beastmode dashboard`
- status.ts retains its ANSI string rendering; dashboard uses Ink components for rendering — data layer shared, presentation layer separate

## Coexistence
- NEVER replace `beastmode watch` — kept as headless fallback for CI/automation
- NEVER replace `beastmode status` or `status --watch` — kept for quick passive viewing
- Dashboard is an additive capability, not a replacement for existing commands
