# k9s TUI Layout Research

**Date:** 2026-04-03
**Source:** k9scli.io, kodekloud.com, palark.com

## Screen Layout

k9s uses a curses-based terminal UI with these key characteristics:

### Three-Zone Main Layout
- **Left sidebar** (~20-25%): Vertical navigation shortcuts, breadcrumbs
- **Central panel** (~60-70%): Tabular resource lists, detail views, logs
- **Right sidebar** (~10-15%): Context-sensitive shortcuts, cluster metrics

### Header/Footer
- **Header**: Minimal — breadcrumbs (e.g., "default > pods > nginx"), cluster version, node count
- **Footer**: Active mode, filter/query status, namespace/context, pulse stats

### Visual Elements
- **Borders**: Single-line (`─`, `│`) or double-line (`═`, `║`) box drawing characters
- **Colors**: Dark base, blue highlight for focus/hover, green for selected/active
- **Text**: White/gray for rows, yellow/orange for warnings, bold/cyan for headers
- **Status indicators**: Color-coded states (red=failing, green=running, yellow=evicted)
- **Spinners/animations**: Pulsing dashboard elements

### Interaction Model
- Vim-style navigation (h/j/k/l) plus arrow keys
- Blue background on hovered row
- Spacebar toggles selection (green background)
- Enter drills into resource
- `:` enters command mode
- `/` opens filter overlay
- Context-sensitive shortcuts adapt per resource type

### Key Aesthetic Principles
- Skinnable themes via YAML
- Braille/Unicode progress indicators
- Inverted colors for fullscreen views (logs)
- Minimal chrome, maximum data density
- Responsive — adjusts to terminal width
