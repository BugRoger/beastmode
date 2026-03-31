---
phase: plan
epic: fullscreen-dashboard
feature: dashboard-ui
---

# Dashboard UI

**Design:** .beastmode/artifacts/design/2026-03-31-fullscreen-dashboard.md

## User Stories

1. As a pipeline operator, I want to run `beastmode dashboard` and see all active epics with their phase, feature progress, and status on a single fullscreen terminal so that I have a complete picture of the pipeline at a glance.
3. As a pipeline operator, I want a scrolling activity log showing dispatched sessions, completions, errors, and blocked gates so that I can follow what the orchestrator is doing in real time.
4. As a pipeline operator, I want spinners on active items and animated progress bars on feature completion so that I can see at a glance which epics are actively being worked on.

## What to Build

A fullscreen Ink v6 React application registered as the `beastmode dashboard` CLI subcommand. The application renders in the alternate screen buffer for clean entry/exit.

**Dependencies:** Add `ink` (v6.8.0) and `react` (peer dependency of Ink) to cli/package.json.

**CLI registration:** Add `dashboard` case to the command router in the CLI entry point, following the same pattern as `watch` and `status`.

**Layout — three-zone vertical stack:**
- **Header zone** — title ("beastmode dashboard"), watch status indicator (reusing the existing watch-running check pattern), and a live clock ticking every 1 second
- **Epic table zone** — rows sorted by phase lifecycle order (via shared data module), each row showing: epic slug, phase (with phase-specific color: magenta/blue/yellow/cyan/green/dim-green/red/dim-red matching existing convention), feature progress (completed/total with animated progress bar), and status (blocked reason if blocked, spinner if active session running). Progress bars show filled/unfilled segments proportional to feature completion. Spinners use Ink's built-in Spinner component on rows with active dispatch sessions
- **Activity log zone** — scrolling list of events (newest at top), sourced from WatchLoop event subscriptions. Each entry shows timestamp, event type, and details (e.g., "14:32:05 dispatched implement for my-epic/feature-3", "14:32:47 completed plan for my-epic (12s)")

**Orchestration integration:** The dashboard creates a WatchLoop instance with signal handlers disabled, starts it, and subscribes to its events. The WatchLoop runs the full scan-dispatch-reconcile cycle at the configured interval. On events, React state is updated and the UI re-renders. The dashboard acquires the same lockfile as `beastmode watch` — mutual exclusion is preserved.

**Refresh cadence:** Orchestration polls at `config.cli.interval` (default 60s). UI refresh for clock and spinners ticks independently at 1s via a React interval effect. State updates are event-driven from WatchLoop, not polled.

**Terminal resize:** Handled natively by Ink's Yoga flexbox layout — no custom resize handling needed.

## Acceptance Criteria

- [ ] `beastmode dashboard` renders fullscreen with header, epic table, and activity log zones
- [ ] Epic rows show phase with correct phase-specific colors matching existing convention
- [ ] Feature progress shown as completed/total with animated progress bars
- [ ] Active items show spinners (Ink Spinner component)
- [ ] Activity log displays dispatched sessions, completions, errors, and blocked gates from WatchLoop events
- [ ] Alternate screen buffer used — terminal is clean on entry and restored on exit
