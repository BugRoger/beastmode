## Problem Statement

The beastmode watch loop spawns parallel agents across git worktrees but provides zero visual feedback. Agents run invisibly inside SDK sessions, requiring stdout scanning or .beastmode-runs.json inspection to understand pipeline state. When 5+ agents run concurrently across multiple epics, the operator has no way to see which agents are working, which are stuck, or what phase each epic is in without manually checking files.

## Solution

Add optional cmux terminal multiplexer integration to the beastmode CLI. When cmux is available and enabled, the watch loop creates a cmux workspace per epic and a terminal surface per dispatched phase/feature. Each agent runs as a real terminal process inside its cmux surface, providing live visibility into every parallel worker. Desktop notifications fire on errors and blocked gates. Surfaces are cleaned up when an epic reaches release. When cmux is not available, the existing SDK-based dispatch path runs unchanged.

## User Stories

1. As an operator running `beastmode watch`, I want each dispatched agent to appear in its own cmux terminal pane so I can visually monitor all parallel workers at a glance
2. As an operator, I want agents grouped by epic in cmux workspaces so I can focus on one epic's progress without distraction from others
3. As an operator, I want desktop notifications only when something goes wrong (errors, blocked gates) so I'm not interrupted by normal operation
4. As an operator, I want cmux surfaces to be automatically cleaned up when an epic is released so stale terminals don't accumulate
5. As an operator restarting `beastmode watch`, I want the watch loop to adopt still-running cmux surfaces from a previous session so agents aren't double-dispatched
6. As an operator without cmux installed, I want the existing SDK-based dispatch to work exactly as before so cmux is never a hard dependency
7. As an operator, I want to configure cmux behavior in config.yaml so I can disable it, change notification verbosity, or adjust cleanup timing without code changes

## Implementation Decisions

- **API layer: Unix socket** — Communicate with cmux via JSON-RPC over `/tmp/cmux.sock`. No process spawning overhead, proper error handling, and compatible with the Bun event loop. A small TypeScript client class wraps the protocol.
- **Surface model: workspace per epic** — One cmux workspace per active epic, with surfaces per dispatched phase or feature within that workspace. Maps naturally to the mental model: switching workspaces = switching epics.
- **Process ownership: cmux-owned** — The watch loop creates a cmux terminal surface and sends `beastmode run <phase> <slug>` into it via `surface.send-text`. cmux owns the shell process. No simulated terminal piping.
- **Completion detection: poll .beastmode-runs.json** — The existing run log is the completion contract. The watch loop already polls on a 60-second tick; on each tick it checks for new run entries matching dispatched sessions. No new protocol needed.
- **Notifications: errors and blocks only** — Desktop notifications via `cmux notify` fire only on phase failures and blocked human gates. No news is good news. Configurable via `cmux.notifications` in config.yaml.
- **Configuration: config.yaml cmux section** — New `cmux:` section alongside `gates:` and `github:`. Three settings: `enabled` (auto/true/false), `notifications` (errors/phase-complete/full), `cleanup` (on-release/manual/immediate).
- **Stale state recovery: reconcile on startup** — When watch starts, query cmux for existing workspaces matching known epic slugs. Live surfaces (process still running) get adopted into the DispatchTracker. Dead surfaces get closed. Empty workspaces get removed.
- **Dispatch abstraction: strategy pattern** — Extract a `DispatchedSession` interface from the current inline SDK dispatch logic. Two implementations: `SdkSession` (existing behavior) and `CmuxSession` (new cmux path). A `SessionFactory` reads config + runtime state to return the right type. The watch loop calls `session.isComplete()` regardless of implementation.
- **Cleanup timing: on release** — When the release phase squash-merges a feature branch, close the epic's cmux workspace and all its surfaces. Mirrors the git worktree lifecycle: created at dispatch, destroyed at release.
- **cmux is strictly optional** — The `cmuxAvailable()` check (socket exists + ping succeeds) combined with config.yaml `cmux.enabled` means zero regression risk. The existing SDK path is the `SdkSession` implementation, fully preserved.

## Testing Decisions

- **CmuxClient unit tests** — Mock the Unix socket. Verify JSON-RPC request/response serialization, reconnection logic, timeout handling, and error mapping. These are pure protocol tests, no cmux installation needed.
- **CmuxSession integration tests** — Test the full lifecycle: create workspace, create surface, send command, detect completion via runs.json, cleanup. Requires either a real cmux instance or a mock socket server.
- **SessionFactory tests** — Verify factory returns `CmuxSession` when cmux is available and config says enabled, `SdkSession` when cmux is unavailable or disabled, and handles `auto` mode correctly.
- **Startup reconciliation tests** — Verify that existing cmux workspaces are correctly adopted (live) or cleaned up (dead) when the watch loop starts.
- **Watch loop dispatch tests** — Existing SDK dispatch tests continue to pass unchanged. New tests verify cmux dispatch path creates workspace/surface and registers in DispatchTracker.
- **Prior art** — Existing tests in `cli/src/__tests__/` for state-scanner, watch loop, and dispatch-tracker establish the patterns: Bun test runner, mock file system, mock SDK responses.

## Out of Scope

- cmux installation, setup, or platform compatibility (macOS only — not our problem)
- cmux browser pane integration (interesting but not needed for pipeline monitoring)
- Cross-platform terminal multiplexer support (Linux/tmux/Zellij are separate features)
- Cost tracking dashboards (that's ccusage or OTLP territory)
- Inter-agent messaging through cmux (nobody has this, we won't invent it here)
- cmux plugin development (cmux-team, cmux-claude-pro are external projects)
- Status pills or progress bars in cmux sidebar (nice-to-have, not part of core integration)

## Further Notes

- The strategy pattern extraction (`DispatchedSession` interface) improves testability of the existing SDK dispatch path regardless of cmux. This refactor has standalone value.
- cmux's socket authentication defaults to `cmuxOnly` (process ancestry check). Since `beastmode watch` runs inside a cmux terminal, the CLI process inherits cmux ancestry and auth succeeds automatically.
- The `surface.send-text` approach means agents get full interactive terminal capability — they can prompt for input if a human gate fires. This is better than the SDK path where interactive input is impossible.

## Deferred Ideas

- **cmux status pills for pipeline progress** — Use `cmux set-status` to show phase progress, cost, and context percentage in the cmux sidebar. Requires defining a status key convention and updating the watch loop tick to push status updates.
- **cmux workspace templates** — Pre-defined layouts (e.g., "2-epic split", "watch + 4 workers") that auto-arrange surfaces when dispatching. Depends on cmux layout save/restore maturing.
- **Headless cmux for CI** — Run cmux in headless mode on Linux CI for pipeline visibility without a GUI. Depends on cmux adding Linux/headless support.
- **ccusage integration in cmux sidebar** — Show real-time cost burn rate per surface. Combine cmux status pills with ccusage data.
