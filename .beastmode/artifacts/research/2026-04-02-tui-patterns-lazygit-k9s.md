# TUI Pattern Research: lazygit & k9s

## Date: 2026-04-02
## Purpose: Identify adaptable patterns for beastmode dashboard improvement

---

## lazygit — Key Patterns

### Layout
- 3-zone: side panels (stacked list views) | main content (diff/preview) | bottom bar (hints + status)
- **Window/tab system**: Multiple views share a window slot, tabs indicate active view
- **Screen modes**: NORMAL / HALF / FULL — three-level zoom for detail pane via `+` key
- **Accordion mode**: Auto-activates in narrow terminals, only focused panel expands

### Navigation
- **Numbered panel jumping** (1-5): Instant focus switch, numbers shown in title prefix
- **Context stack**: Push/pop model. Side contexts replace stack, popups stack on top, ESC pops
- **Tab cycling**: Left/right within a window slot (e.g., Files -> Worktrees -> Submodules)
- **Selection drives content**: Selecting item in list auto-renders detail in main view

### Keybindings
- **Context-sensitive**: Same key does different things per panel (d = discard/delete/drop)
- **Three layers**: Global > Context-specific > Guards
- **Bottom options bar**: Context-sensitive hints, updates on focus change
- **Disabled-with-reason**: Actions shown grayed with explanation, not hidden
- **`?` opens help**: Lists all keybindings for current context

### Status/Feedback
- **Inline spinners**: Operation state tied to specific list items (e.g., "Pushing..." on a branch)
- **Toast notifications**: Brief, auto-dismissing success/error messages
- **Command log**: Shows every git command executed — transparency panel
- **Conditional confirmations**: `ConfirmIf(dangerous, opts)` — prompt only for destructive ops

### Information Density
- Columnar rendering with auto-alignment
- Color-coded status (green=staged, red=unstaged, yellow=conflicts)
- Commit graph drawn inline
- Truncation to view width, no horizontal scroll in lists

---

## k9s — Key Patterns

### Layout
- **Stacked flexbox**: Header | Prompt (conditional) | Content (PageStack) | Crumbs | Flash
- **Collapsible header**: Full header (cluster info + menu + logo) vs single-line StatusIndicator via Ctrl+E
- **PageStack content**: Each navigation pushes a new full-screen view, ESC pops

### Navigation
- **Push/pop view stack with breadcrumbs**: Crumb bar shows stack as trail, active crumb highlighted
- **Command palette** (`:`): Type resource alias to switch entire view. Autocomplete + history
- **History navigation**: `[`/`]` for back/forward, `-` for toggle-last (like `cd -`)
- **Drill-down via Enter**: View YAML, enter container, describe resource

### Keybindings
- **Dynamic action map per view**: Actions rebuilt based on resource type + RBAC permissions
- **`Dangerous` flag**: Hidden in read-only mode
- **Hotkeys**: User-defined in YAML, hot-reloaded, appear in `?` help automatically
- **Column sort**: Shift+letter cycles through columns

### Status/Feedback
- **Flash messages**: Transient, color-coded (info=aqua, warn=orange, error=red), channel-driven
- **Pulse view** (`:pulse`): Gauge charts + sparklines for aggregate health, drill-down on Enter
- **Connection resilience**: Exponential backoff, visual indication of connectivity state

### Information Density
- Per-resource renderers with custom column definitions
- Auto-width columns from content (MaxPad calculations)
- Row color functions map data to status colors
- Truncation over horizontal scrolling

### Interactive Patterns
- **Filter mode** (`/`): Regex, label selectors, fuzzy, inverse (`!`), persistent until cleared
- **Multi-select**: Space to toggle, bulk operations
- **Streaming log view**: Auto-scroll, timestamp toggle, container selection, search within

### Extensibility
- **Plugin system**: Shortcut + scope + external command + env vars. 40+ community plugins
- **Skin system**: Complete YAML color map for every UI element. 30+ themes. Cluster-specific skins

---

## Current Beastmode Dashboard (v0.55.0)

### What Exists
- Ink v6 + React fullscreen TUI with alternate screen buffer
- Three-zone layout: header (title + status + clock), epic table, activity log
- Keyboard navigation: arrows for row selection, `c` for cancel flow, `q`/Ctrl+C for quit, `a` toggle all
- Cancel confirmation modal (y/n)
- Animated spinners and progress bars on active items
- Phase-specific colors
- Embedded WatchLoop with EventEmitter typed events
- Shared data logic via status-data.ts

### What's Missing (compared to lazygit/k9s)
- No drill-down / detail view (can't see features, logs, or agent output)
- No command palette or quick-switch
- No breadcrumb navigation
- No filter/search
- No help overlay (`?`)
- No screen mode zoom
- No collapsible header
- No flash/toast feedback
- No bulk operations
- No column sorting
- No plugin/extensibility system
- No theming
- No command log / transparency view

---

## Top Adaptable Patterns (Ranked by Impact)

### Tier 1 — High Impact, Natural Fit
1. **Drill-down view stack** (k9s): Epic table → feature list → agent log. ESC pops back. Crumb bar.
2. **Context-sensitive key hints** (lazygit): Bottom bar shows available keys for current view. Updates on focus.
3. **Help overlay `?`** (both): Lists all keybindings for current context.
4. **Flash messages** (k9s): Transient feedback for phase transitions, errors, gate blocks.

### Tier 2 — Medium Impact, Good UX
5. **Filter mode `/`** (k9s): Filter epics by phase, status, name. Regex support.
6. **Screen mode zoom `+`** (lazygit): NORMAL / HALF / FULL for detail pane. Three levels.
7. **Collapsible header** (k9s): Toggle between full header and minimal status line.
8. **Column sorting** (k9s): Sort epic table by phase, status, age.

### Tier 3 — Nice to Have, Future
9. **Command palette `:`** (k9s): Switch views, trigger actions by name.
10. **Disabled-with-reason keys** (lazygit): Show why an action is unavailable.
11. **Inline operation status** (lazygit): Per-item spinners with operation name.
12. **Skin/theme system** (k9s): YAML-based color customization.
