# Dashboard

## Framework and Rendering
- ALWAYS use Ink v6.8.0 + React for fullscreen TUI rendering — Yoga flexbox handles terminal resize natively
- ALWAYS use alternate screen buffer (`\x1b[?1049h` / `\x1b[?1049l`) for clean terminal entry and exit
- UI refresh ticks every 1 second independently of the orchestration scan interval — spinners and clock update smoothly
- Color scheme follows existing phase convention: magenta (design), blue (plan), yellow (implement), cyan (validate), green (release), dim green (done), red (blocked), dim red (cancelled)

## Layout
- Three-panel split screen: epics list (top-left ~30%), details (top-right ~70%), log (bottom ~65% full-width)
- k9s-style cyan chrome with single-line box-drawing characters and panel titles inset in top borders
- Watch status and clock rendered in top-right corner of outer border — no dedicated header row
- Key hints bar at bottom, outside the bordered area
- Minimum terminal size enforced at 80x24 — friendly message below that threshold

## Interaction Model
- Epics panel is the sole interactive panel — details and log are passive displays reacting to epic selection
- Flat navigation model — no drill-down, no view stack, no breadcrumbs
- "(all)" entry at top of epic list shows aggregate pipeline overview and interleaved log stream
- Selecting a specific epic filters details and log in place

## Keyboard
- `q`/`Ctrl+C` (graceful quit), `Up`/`Down` (navigate epics), `a` (toggle done/cancelled), `x` (cancel with inline confirmation), `/` (filter mode)
- Filter: k9s style — inline prompt replaces key hints, Enter applies, Escape clears
- Cancel: inline confirmation in key hints bar — `y` executes, `n`/Escape dismisses, blocks all other input

## SDK Dispatch Override
- ALWAYS force SDK dispatch strategy when dashboard is running — dashboard requires SDK message streams, iTerm2 and cmux sessions have no stream to tap
- This is a runtime override, not a config change — `cli.dispatch-strategy` setting is ignored while the dashboard is active

## Message Mapper
- Structured message mapper converts SDKMessage types into terminal-friendly log entries (~200 lines)
- Text deltas stream inline; tool calls render as one-liners: `[Read] file.ts`, `[Edit] file.ts:45-60`, `[Bash] bun test`
- Tool results show brief output (e.g., `> 3 tests passed`)

## Ring Buffer
- ALWAYS allocate a ring buffer per dispatched SDK session (~100 recent log entries)
- Buffers collect continuously even when the user is viewing a different session — no subscribe-on-demand gaps
- Merge on render for aggregate views — no pre-merged buffers
- Only visible lines rendered, not the full buffer

## Watch Loop Integration
- ALWAYS embed WatchLoop directly in the dashboard process — dashboard IS the orchestrator
- ALWAYS subscribe to WatchLoop EventEmitter typed events for React state updates
- ALWAYS use the same lockfile as `beastmode watch` — mutual exclusion prevents two orchestrators
- ALWAYS externalize signal handling — Ink app's SIGINT handler calls `loop.stop()`

## Shared Data Module
- ALWAYS use `status-data.ts` for sorting, filtering, snapshot building, and change detection — shared between `beastmode status` and `beastmode dashboard`
- Data layer shared, presentation layer separate (ANSI strings for status, Ink components for dashboard)

## Coexistence
- NEVER replace `beastmode watch` — kept as headless fallback for CI/automation
- NEVER replace `beastmode status` or `status --watch` — kept for quick passive viewing
- Dashboard is an additive capability, not a replacement for existing commands

## Release Queue Indicator
- Epics held for release serialization show a "Queued" badge with blocking epic context in the EpicList view
- Data sourced from `release:held` WatchLoop EventEmitter events — no manifest-level state, purely event-driven
- Indicator clears on `session-started` or next `scan-complete` for the held epic
- Only displayed for automated watch loop dispatch — manual releases are not tracked
