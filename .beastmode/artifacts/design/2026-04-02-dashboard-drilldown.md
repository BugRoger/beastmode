---
phase: design
slug: dashboard-drilldown
epic: dashboard-drilldown
---

## Problem Statement

The beastmode dashboard (`beastmode dashboard`) is a status display, not a dashboard. It shows a flat table of epics with phase badges and progress bars, but you cannot drill into an epic to see its features, agent output, or what's actually happening inside. When multiple agents are running in parallel, the only visibility is a one-line status per epic and a 10-line activity log. Users are blind to the work being done.

## Solution

Add k9s-style push/pop drill-down navigation to the dashboard with live SDK streaming. Three views form a view stack: Epic List → Feature List → Agent Log. Each drill-down replaces the full content area (not a split pane), with a breadcrumb bar for orientation. The SDK dispatch layer is refactored from fire-and-forget to async generator iteration, enabling live structured log rendering in the agent log view — text deltas interleaved with tool call one-liners.

## User Stories

1. As a user viewing the epic table, I want to press Enter on an epic to see its features and their individual statuses, so that I can understand what's happening inside an epic without leaving the dashboard.

2. As a user viewing a feature list, I want to press Enter on an active feature to see a live structured log of the agent's output (text and tool calls), so that I can observe the agent working in real-time.

3. As a user drilled into a feature or agent log, I want to press Escape to go back to the previous view, so that navigation feels predictable and I never get lost.

4. As a user at any drill-down level, I want to see a breadcrumb bar showing my position in the view stack (e.g., "epics > cancel-cleanup > cancel-logic"), so that I always know where I am.

5. As a user at any drill-down level, I want the key hints bar to show only the keys that work in the current view, so that the interface teaches itself.

6. As a user, I want the activity log to remain visible at the bottom of every view, so that I always have a pipeline heartbeat regardless of drill-down depth.

7. As a user, I want agent output to be available immediately when I navigate to a feature, even if I wasn't viewing it before, so that I can check on any session without having to have been watching it from the start.

## Implementation Decisions

- **View stack architecture**: Three view types (EpicList, FeatureList, AgentLog) managed as a push/pop stack. Enter pushes, Escape pops. Only one view renders in the content area at a time. The stack state drives the breadcrumb bar.

- **Full-screen replace layout**: When drilling down, the content area is fully replaced (k9s model), not split into list + detail (lazygit model). This maximizes content space in the terminal. Persistent chrome: header, crumb bar, content area, activity log, key hints.

- **SDK dispatch refactor**: The current `dispatchPhase()` in `watch-command.ts` uses the old `ClaudeAgent` class with `await agent.query()` (fire-and-forget). This must be refactored to use the SDK's `query()` function export, which returns `AsyncGenerator<SDKMessage>`. With `includePartialMessages: true`, the generator yields `SDKPartialAssistantMessage` (streaming text/tool deltas), `SDKAssistantMessage` (complete turns), `SDKToolProgressMessage` (heartbeats), and `SDKResultMessage` (completion). The `for await` loop pipes messages to an EventEmitter that the dashboard subscribes to.

- **Dashboard forces SDK dispatch**: When the dashboard is running, the dispatch strategy is overridden to `sdk` regardless of the `cli.dispatch-strategy` config setting. The dashboard requires SDK message streams; iTerm2 and cmux sessions are terminal processes with no stream to tap. This is a runtime override, not a config change.

- **Structured log renderer**: A message mapper (~200 lines) converts `SDKMessage` types into display-friendly log entries. Text deltas stream inline. Tool calls render as one-liners: `[Read] cancel-logic.ts`, `[Edit] cancel-logic.ts:45-60`, `[Bash] bun test --filter cancel`. Tool results show brief output (e.g., `> 3 tests passed`). Inspired by PostHog/code's `sdk-to-acp.ts` conversion pattern but adapted for terminal rendering rather than protocol conversion.

- **Ring buffer per session**: Each dispatched SDK session gets a ring buffer of ~100 recent log entries. Buffers are always collecting, even when the user is viewing a different session. Navigating to any session shows its buffer contents immediately. This avoids subscribe-on-demand gaps where you miss history.

- **Context-sensitive key hints**: The bottom bar updates based on the active view. Epic list shows: `q quit ↑↓ navigate ↵ drill x cancel a all`. Feature list shows: `q quit ↑↓ navigate ↵ drill ⎋ back`. Agent log shows: `q quit ↑↓ scroll ⎋ back f follow`. Each view type exports its own key hint set.

- **Crumb bar component**: A single-line breadcrumb widget between the header and content area. Format: `epics > cancel-cleanup > cancel-logic`. Active (rightmost) crumb highlighted. Updated on every push/pop.

- **DispatchedSession extension**: The `DispatchedSession` interface in `watch-types.ts` gains an `events: EventEmitter` field (or similar) that the dashboard's AgentLog view subscribes to for live messages. The ring buffer is populated from this emitter.

## Testing Decisions

- **View stack navigation**: Unit tests for push/pop/peek operations on the view stack. Verify crumb bar content at each depth. Verify Escape at root level is a no-op.
- **Message mapper**: Unit tests for each SDK message type → display entry conversion. Test text deltas, tool_use blocks, tool results, and edge cases (empty content, unknown tool names).
- **Ring buffer**: Unit tests for buffer capacity, eviction, and retrieval. Verify buffer collects while view is not active.
- **SDK dispatch refactor**: Integration test that dispatches a phase via the new `query()` path and verifies messages are emitted.
- **Prior art**: Follow existing test patterns in `cli/src/__tests__/` — Bun test runner, `.test.ts` suffix.

## Out of Scope

- Filter mode (`/` to filter epics by name/phase/status)
- Column sorting on epic table
- Help overlay (`?` keybinding listing all available keys)
- Collapsible header (Ctrl+E to minimize)
- Command palette (`:` to switch views by name)
- Skin/theme system
- Plugin/extensibility system
- Mouse input
- Actions from dashboard (approve gates, trigger phases, rescan)
- Pause/resume orchestration
- Split-pane layout option

## Further Notes

- Research artifact at `.beastmode/artifacts/research/2026-04-02-tui-patterns-lazygit-k9s.md` documents the full TUI pattern analysis from lazygit and k9s that informed these decisions.
- The SDK's `query()` function is incompatible with extended thinking (`maxThinkingTokens > 0`). If beastmode agents use extended thinking, streaming will need to fall back to `SDKToolProgressMessage` heartbeats only.
- The PostHog/code project (`packages/agent/src/adapters/claude/conversion/sdk-to-acp.ts`) provides the most mature reference implementation for SDK message → display conversion, including tool use lifecycle tracking and file content caching.

## Deferred Ideas

- **Action mode**: Let the dashboard trigger phases, approve gates, force rescan — turning it from observe-only to a control plane.
- **Filter mode**: `/` to filter epics by regex on name, phase, or status. Borrowed from k9s.
- **Help overlay**: `?` to show all keybindings for the current view context. Borrowed from both lazygit and k9s.
- **Screen mode zoom**: `+` to cycle NORMAL/HALF/FULL like lazygit, giving more space to the agent log.
- **Flash messages**: Transient notifications for phase completions and errors, replacing activity log entries for high-priority events.
