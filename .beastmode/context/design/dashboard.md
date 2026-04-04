# Dashboard

## Framework and Rendering
- ALWAYS use Ink v6.8.0 + React for fullscreen TUI rendering — Yoga flexbox handles terminal resize natively
- ALWAYS use alternate screen buffer (`\x1b[?1049h` / `\x1b[?1049l`) for clean terminal entry and exit
- UI refresh ticks every 1 second independently of the orchestration scan interval — spinners and clock update smoothly
- Color scheme follows existing phase convention: magenta (design), blue (plan), yellow (implement), cyan (validate), green (release), dim green (done), red (blocked), dim red (cancelled)

## Layout
- Two-column full-height layout via TwoColumnLayout component with EpicsPanel, DetailsPanel, LogPanel as slot children: left column (40% width) stacks epics panel (60% height) above details panel (40% height), right column (60% width) shows full-height tree view
- No outer chrome border — header is a plain Box row with "beastmode" left, watch status + clock right
- Each panel wrapped in PanelBox with cyan single-line borders, inset titles, and dark charcoal (#2d2d2d) interior backgrounds
- Key hints bar at bottom, below the columns
- Minimum terminal size enforced at 80x24 — friendly message below that threshold

## Interaction Model
- Epics panel is the sole interactive panel — details and log are passive displays reacting to epic selection
- Flat navigation model — no drill-down, no view stack, no breadcrumbs
- "(all)" entry at top of epic list shows aggregate pipeline overview and interleaved log stream
- Selecting a specific epic filters details and log in place

## Keyboard
- All keyboard input handled by use-dashboard-keyboard hook — single hook for flat navigation, filter mode, cancel confirmation, and toggle
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
- Ring buffer entries feed into the TreeView component via `useDashboardTreeState` adapter — adapter transforms flat entries + session events into tree state

## Log Panel Tree View
- ALWAYS use shared `<TreeView />` component for log panel rendering — same component used by `beastmode watch`
- Tree hierarchy: epic > phase > feature with vertical line connectors and phase-based coloring
- `useDashboardTreeState` adapter hook bridges existing data sources (ring buffers + session events) to tree state — rendering layer swap, data flow unchanged
- Tree trimming for auto-follow within alternate screen buffer — newest entries visible at bottom

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
- Epics held for release serialization show a "Queued" badge with blocking epic context in the EpicsPanel
- Data sourced from `release:held` WatchLoop EventEmitter events — no manifest-level state, purely event-driven
- Indicator clears on `session-started` or next `scan-complete` for the held epic
- Only displayed for automated watch loop dispatch — manual releases are not tracked
