# Dashboard

## Framework and Rendering
- ALWAYS use Ink v6.8.0 + React for fullscreen TUI rendering — Yoga flexbox handles terminal resize natively
- ALWAYS use alternate screen buffer (`\x1b[?1049h` / `\x1b[?1049l`) for clean terminal entry and exit
- UI refresh ticks every 1 second independently of the orchestration scan interval — spinners and clock update smoothly
- Color scheme follows existing phase convention: magenta (design), blue (plan), yellow (implement), cyan (validate), green (release), dim green (done), red (blocked), dim red (cancelled)

## Layout
- Three-panel split screen via ThreePanelLayout component with EpicsPanel, OverviewPanel, LogPanel as slot children: epics list (top-left ~30%), overview (top-right ~70%), log (bottom ~65% full-width)
- k9s-style cyan chrome with single-line box-drawing characters and panel titles inset in top borders (custom top line: disable Ink borderTop, emit `┌─ TITLE ─...─┐` manually — no third-party library)
- Outer Box receives explicit `height={rows}` from `useTerminalSize()` hook passed through App.tsx for fullscreen auto-expansion — does not rely on `height="100%"` alone
- Watch status and clock rendered in top-right corner of NyanBanner header row
- Key hints bar at bottom, outside the bordered area
- Minimum terminal size enforced at 80x24 — friendly message below that threshold

## Header / NyanBanner
- Dashboard header replaced by NyanBanner component — 2-line ASCII block art rendered with continuously cycling nyan cat rainbow colors
- Color cycling: 6-stripe palette (Red #FF0000, Orange #FF9008, Yellow #F6FF00, Green #7CFF27, Cyan #5FFBFF, Purple #6400FF), each non-space character gets color `(charIndex + tickOffset) % 6`, spaces pass through uncolored
- Animation tick: 80ms interval via `useEffect` — matches existing spinner tick rate, both banner lines share same offset for vertical stripe coherence
- Color engine is a pure function in `nyan-colors.ts` — stateless, independently testable
- Watch status and clock remain right-aligned on banner row 1

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

## Dispatch Strategy
- ALWAYS wire `selectStrategy(config.cli["dispatch-strategy"])` into the dashboard command — same function the watch command uses, identical factory selection path
- Dashboard honors the operator's configured dispatch strategy (sdk, cmux, iterm2, auto) — no forced SDK override
- When SDK strategy is selected, live message streaming is available via `SessionHandle.events`; when non-SDK strategy is selected, the log panel falls back to lifecycle event entries

## Event Log Fallback (Non-SDK Dispatch)
- When `SessionHandle.events` is undefined (non-SDK strategies), the log panel renders lifecycle events from the WatchLoop EventEmitter instead of streaming output
- `session-started` → "dispatching" status entry; `session-completed` success → "completed" entry; `session-completed` failure or `error` → "failed" entry
- Fallback entries use the same tree structure as SDK streaming entries — same panel, same format, fewer entries
- ALWAYS implement fallback via a `FallbackEntryStore` that converts WatchLoop lifecycle events to `LogEntry` objects — separates event conversion from rendering logic

## Verbosity Cycling
- ALWAYS initialize verbosity state in the root App component from the CLI-provided verbosity arg — single source of truth, propagated down as props
- `v` key cycles verbosity: info → detail → debug → trace → info (wrap); ignored in filter mode and confirm mode
- Log entries are filtered at render time by the current verbosity level — entries remain in ring buffers so they reappear immediately when verbosity increases (no data loss)
- Key hints bar shows current verbosity level: `v verb:info` / `v verb:detail` / `v verb:debug` / `v verb:trace` — updates reactively on keypress
- Four verbosity levels map to numeric indices (0-3) — cycling uses modular increment

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
