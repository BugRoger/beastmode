# Dashboard

## Framework and Rendering
- ALWAYS use Ink v6.8.0 + React for fullscreen TUI rendering — Yoga flexbox handles terminal resize natively
- ALWAYS use alternate screen buffer (`\x1b[?1049h` / `\x1b[?1049l`) for clean terminal entry and exit
- UI refresh ticks every 1 second independently of the orchestration scan interval — spinners and clock update smoothly
- Color scheme follows Monokai Pro palette: purple #AB9DF2 (design), cyan #78DCE8 (plan), yellow #FFD866 (implement), green #A9DC76 (validate), orange #FC9867 (release), dim green (done), red #FF6188 (blocked/cancelled) — all values exported from a single shared monokai-palette module

## Layout
- Three-panel vertical split via ThreePanelLayout: left column (35% width) contains EpicsPanel (60% height) stacked above DetailsPanel (40% height); right column (65% width) contains LogPanel at full height
- No outer chrome border — each panel renders its own PanelBox border with title inset (custom top line: `┌─ TITLE ─...─┐` via `"─".repeat(200)` + terminal clipping — no third-party library)
- Panel borders: Monokai gray #727072; panel titles: Monokai cyan #78DCE8
- Outer Box receives explicit `height={rows}` from `useTerminalSize()` hook passed through App.tsx for fullscreen auto-expansion — does not rely on `height="100%"` alone
- Watch status and clock rendered in top-right corner of NyanBanner header row
- Key hints bar at bottom, outside the panel area
- Minimum terminal size enforced at 80x24 — friendly message below that threshold

## Header / NyanBanner
- Dashboard header is a NyanBanner component — 2-line ASCII block art rendered with continuously cycling nyan cat rainbow colors
- Color cycling: 256-step interpolated palette via linear RGB interpolation between 6 nyan cat anchor colors (~43 steps per transition); each non-space character gets color `palette[(charIndex + tickOffset) % 256]`, spaces pass through uncolored
- Animation tick: 80ms interval via `useEffect` — 256-step width produces ~20-second full rotation (slow, buttery color wash); both banner lines share same offset for vertical stripe coherence
- Tick state lifted to App.tsx — NyanBanner accepts optional `tick` prop; shared with ThreePanelLayout for focus border animation
- Color engine is a pure function in `nyan-colors.ts` — stateless, independently testable
- Trailing animated dots: 15 `▄` characters appended to banner line 2, colored by the same gradient engine
- Watch status and clock remain right-aligned on banner row 1

## Monokai Pro Palette Module
- ALWAYS import dashboard colors from the shared `monokai-palette` module — no inline hex values or duplicate PHASE_COLOR maps in consumers
- Module exports: PHASE_COLORS map (design/plan/implement/validate/release/done/cancelled/blocked), chrome colors (BORDER #727072, TITLE #78DCE8, WATCH_RUNNING #A9DC76, WATCH_STOPPED #FF6188, CLOCK_HINTS #727072), and DEPTH background constants (CHROME #403E41, PANEL #353236, TERMINAL #2D2A2E)
- Consumers: EpicsPanel, OverviewPanel, PanelBox, ThreePanelLayout, tree-format, status.ts — all import from shared module, zero duplicate definitions

## Depth Hierarchy
- Three-tier background system creates visual depth without harsh borders: Tier 1 chrome (#403E41, header + hints bars), Tier 2 panel interiors (#353236, all PanelBox content areas), Tier 3 terminal (#2D2A2E, natural terminal background in gaps)
- Tiers progress from lightest (chrome) to darkest (terminal) — depth reads naturally, heavier elements sit deeper
- ALWAYS use DEPTH constants from monokai-palette — never inline the hex values in layout or panel components

## Interaction Model
- Two interactive panels: EpicsPanel and LogPanel — Tab key toggles focus between them
- Arrow keys route to the currently focused panel (`focusedPanel` state)
- DetailsPanel is a passive display reacting to epic/feature selection
- Flat navigation model — no drill-down, no view stack, no breadcrumbs
- "(all)" entry at top of epic list shows aggregate pipeline overview and interleaved log stream
- Selecting a specific epic filters details and log in place

## Keyboard
- All keyboard input handled by use-dashboard-keyboard hook — single hook for navigation, focus, filters, scroll, cancel confirmation, and toggle
- `q`/`Ctrl+C` (graceful quit), `Up`/`Down` (navigate in focused panel), `a` (toggle done/cancelled), `x` (cancel with inline confirmation), `/` (filter mode)
- `Tab` (toggle focus between Epics and Log panels), `p` (cycle phase filter), `b` (toggle blocked filter), `G`/`End` (resume auto-follow)
- `PgUp`/`PgDn` (scroll details panel via `detailsScrollOffset`)
- Arrow key routing: when `focusedPanel === 'epics'` arrows navigate epics; when `focusedPanel === 'log'` arrows scroll log
- Filter: k9s style — inline prompt replaces key hints, Enter applies, Escape clears
- Cancel: inline confirmation in key hints bar — `y` executes, `n`/Escape dismisses, blocks all other input

## Dispatch
- Dashboard uses ITermSessionFactory directly — the sole implementation of SessionFactory
- Log panel renders lifecycle event entries (dispatching / completed / failed) via FallbackEntryStore

## Lifecycle Log Entries
- WatchLoop lifecycle events are converted to `LogEntry` objects by `FallbackEntryStore`
- `session-started` → "dispatching" status entry; `session-completed` success → "completed" entry; `session-completed` failure or `error` → "failed" entry
- Entries use the same tree structure as other log entries — same panel, same format
- ALWAYS implement via `FallbackEntryStore` that converts WatchLoop lifecycle events to `LogEntry` objects — separates event conversion from rendering logic
- `LogEntry` carries an optional `level` field — when present, `entryTypeToLevel()` prefers it over the type-based mapping; set this field in `lifecycleToLogEntry()` for events where the correct level differs from the `"text"` type default (debug for heartbeats, warn for abnormal conditions)

## Verbosity Cycling
- ALWAYS initialize verbosity state in the root App component from the CLI-provided verbosity arg — single source of truth, propagated down as props
- `v` key cycles verbosity: info → detail → debug → trace → info (wrap); ignored in filter mode and confirm mode
- Log entries are filtered at render time by the current verbosity level — entries remain in ring buffers so they reappear immediately when verbosity increases (no data loss)
- Key hints bar shows current verbosity level: `v verb:info` / `v verb:detail` / `v verb:debug` / `v verb:trace` — updates reactively on keypress
- Four verbosity levels map to numeric indices (0-3) — cycling uses modular increment

## Log Panel Tree View
- ALWAYS use shared `<TreeView />` component for log panel rendering
- Tree hierarchy: CLI > Epic > Feature — phase displayed as colored badge on each entry, not as a tree level
- CliNode at root, EpicNode children, FeatureNode leaves — PhaseNode removed
- `useDashboardTreeState` adapter hook bridges existing data sources (ring buffers + session events) to tree state — rendering layer swap, data flow unchanged
- Tree trimming for auto-follow within alternate screen buffer — newest entries visible at bottom
- `isDim` function covers blocked and pending statuses in addition to done/cancelled

## Epics Tree Expansion
- Flat row model (`buildFlatRows`, `rowSlugAtIndex`) — epics and their expanded features share a single flat selectable list
- Single-expand: selecting a different epic collapses the previous one; selecting the same epic again toggles collapse
- `expandedEpicSlug` state tracks the currently expanded epic
- `itemCount` and `slugAtIndex` account for expanded feature rows
- Selection state union: `{ type: 'all' } | { type: 'epic', epicSlug } | { type: 'feature', epicSlug, featureSlug }` — consumers (Details panel) differentiate by selection type
- Feature status color map and dim function for visual distinction

## Focus Border
- Animated nyan border on focused panel using `NYAN_PALETTE[tick % 256]`
- PanelBox accepts optional `borderColor` prop — focused panel receives animated color, unfocused panels use default `CHROME.border`
- Tab key toggles `focusedPanel` state between 'epics' and 'log'

## Details Panel
- Renamed from OverviewPanel — context-sensitive content driven by selection type
- Selection `{ type: 'all' }` → aggregate overview; `{ type: 'epic' }` → PRD artifact content; `{ type: 'feature' }` → plan artifact content
- Artifact loading via `resolveArtifactPath()` utility
- PgUp/PgDn scroll via `detailsScrollOffset` from keyboard hook
- Scroll offset resets on selection change

## Filters
- Phase filter: `phaseFilter` state, 'p' key cycles through phases (design → plan → implement → validate → release → all)
- Blocked filter: `showBlocked` boolean, 'b' key toggles visibility of blocked entries
- Both filters applied to tree state before LogPanel rendering
- Skeleton nodes remain visible when all entries filtered out

## Watch Loop Integration
- ALWAYS embed WatchLoop directly in the dashboard process — dashboard IS the orchestrator
- ALWAYS subscribe to WatchLoop EventEmitter typed events for React state updates
- ALWAYS use the dashboard lockfile — mutual exclusion prevents two orchestrators
- ALWAYS externalize signal handling — Ink app's SIGINT handler calls `loop.stop()`

## Shared Data Module
- ALWAYS use `status-data.ts` for sorting, filtering, snapshot building, and change detection — shared data module for the dashboard

## Sole Orchestrator
- Dashboard is the sole orchestration entry point — embeds the WatchLoop directly
- No separate headless watch command — dashboard IS the orchestrator

## Release Queue Indicator
- Epics held for release serialization show a "Queued" badge with blocking epic context in the EpicsPanel
- Data sourced from `release:held` WatchLoop EventEmitter events — no manifest-level state, purely event-driven
- Indicator clears on `session-started` or next `scan-complete` for the held epic
- Only displayed for automated watch loop dispatch — manual releases are not tracked
