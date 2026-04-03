---
phase: plan
slug: dashboard-rework
epic: dashboard-rework
feature: log-panel
wave: 2
---

# Log Panel

**Design:** `.beastmode/artifacts/design/2026-04-03-dashboard-rework.md`

## User Stories

1. As a user, I want to see all my epics, their details, and live logs on a single screen, so that I don't have to navigate between views to understand pipeline state.
3. As a user, I want an "(all)" option in the epic list that shows an aggregate log stream and pipeline overview stats, so that I can monitor the entire pipeline at a glance.
4. As a user, I want the log panel to take most of the screen (~65%), so that I can follow session activity in detail.
7. As a user, I want the dashboard to show a clean placeholder when no sessions are active, so that the UI doesn't look broken when the pipeline is idle.

## What to Build

Build the log panel that renders in the bottom section of the three-panel layout. This panel is passive — it displays log entries filtered by the currently selected epic.

**Two modes based on selection:**

**"(all)" selected — Aggregate stream:** Merge log entries from all active session ring buffers, sorted by timestamp. Each log line shows: timestamp (dim) + feature name (bold white) + content (regular white). Errors render in red. The merge happens on render — no pre-merged buffer.

**Single epic selected — Filtered stream:** Show only log entries from the selected epic's active sessions. Same line format as aggregate mode. If the epic has multiple active feature sessions (implement phase), interleave them sorted by timestamp.

**Log line format:** `HH:MM:SS  feature-name  content` — timestamp dim, feature name bold white, content regular white. Error lines in red. Use the existing SDK message mapper and log-format utilities for content formatting.

**Auto-follow:** Log always auto-follows (scrolls to newest entry). No manual scroll mode in the new design — the log panel is a passive stream display.

**Empty state:** When no active sessions exist for the current selection, show a dim centered placeholder: "no active sessions".

**Ring buffer integration:** Consume the existing per-session RingBuffer instances (from SessionEmitter). For aggregate mode, collect all active session emitters. For single-epic mode, collect only that epic's session emitters. Subscribe to 'entry' events for live updates.

**Performance:** With up to 10 concurrent epics and 100 entries per ring buffer, the worst-case aggregate merge is 1000 entries. Render only the entries that fit the visible panel height.

## Acceptance Criteria

- [ ] "(all)" selection shows interleaved aggregate log from all active sessions, sorted by timestamp
- [ ] Single epic selection shows only that epic's session logs
- [ ] Log line format: timestamp (dim) + feature name (bold white) + content (white), errors in red
- [ ] Log auto-follows (newest entries always visible)
- [ ] Empty state shows dim "no active sessions" placeholder
- [ ] Merge happens on render from per-session ring buffers — no pre-merged buffer
- [ ] Panel updates live as new log entries arrive via SessionEmitter events
- [ ] Only visible lines rendered (not the full buffer)
