## Problem Statement

The beastmode watch loop spawns parallel agents across git worktrees but provides zero visual feedback. Agents run invisibly inside SDK sessions or CLI subprocesses, requiring stdout scanning or `.beastmode-runs.json` inspection to understand pipeline state. When 5+ agents run concurrently across multiple epics, the operator has no way to see which agents are working, which are stuck, or what phase each epic is in without manually checking files. The CLI architecture has evolved since the original cmux-integration design — the dispatch path, worktree lifecycle, and phase command structure have shifted, requiring a fresh integration approach.

## Solution

Add optional cmux terminal multiplexer integration to the beastmode CLI via a formal strategy pattern. A `SessionStrategy` interface defines `dispatch()`, `isComplete()`, and `cleanup()` contracts. Two implementations exist: `SdkStrategy` (extracted from the current inline dispatch logic) and `CmuxStrategy` (new cmux integration). A `SessionFactory` selects the appropriate strategy based on `cli.dispatch-strategy` config and runtime cmux availability.

When cmux is selected, the watch loop creates a cmux workspace per epic and a terminal surface per dispatched phase/feature. Each surface runs `beastmode <phase> <slug>` as a real terminal process via `cmux send-surface`, providing live visibility into every parallel worker. Completion is detected via `.dispatch-done.json` marker files written by `phaseCommand` on exit, watched by `fs.watch`. Desktop notifications fire on errors and blocked gates. Surfaces are cleaned up when an epic reaches release.

When cmux is not available or not configured, the existing SDK-based dispatch path runs unchanged as the `SdkStrategy` implementation.

## User Stories

1. As an operator running `beastmode watch`, I want each dispatched agent to appear in its own cmux terminal pane so I can visually monitor all parallel workers at a glance
2. As an operator, I want agents grouped by epic in cmux workspaces so I can focus on one epic's progress without distraction from others
3. As an operator, I want desktop notifications only when something goes wrong (errors, blocked gates) so I'm not interrupted by normal operation
4. As an operator, I want cmux surfaces to be automatically cleaned up when an epic is released so stale terminals don't accumulate
5. As an operator restarting `beastmode watch`, I want the watch loop to adopt still-running cmux surfaces from a previous session so agents aren't double-dispatched
6. As an operator without cmux installed, I want the existing SDK-based dispatch to work exactly as before so cmux is never a hard dependency
7. As an operator, I want to configure the dispatch strategy in config.yaml so I can switch between SDK and cmux dispatch without code changes

## Implementation Decisions

- **Dispatch architecture: SessionStrategy interface** — Formalize dispatch into a `SessionStrategy` interface with `dispatch()`, `isComplete()`, and `cleanup()` methods. Two implementations: `SdkStrategy` (existing behavior extracted) and `CmuxStrategy` (new). A `SessionFactory` reads config + runtime state to return the right strategy. The watch loop calls strategy methods regardless of implementation.
- **cmux communication: CLI wrapper** — Communicate with cmux by shelling out to the `cmux` binary with `--json` flag. No direct Unix socket programming. A typed `CmuxClient` module wraps the CLI: `ping()`, `newWorkspace()`, `newSplit()`, `sendSurface()`, `closeSurface()`, `listWorkspaces()`, `notify()`. Process spawn overhead is negligible at dispatch-time frequency.
- **Surface model: workspace per epic** — One cmux workspace per active epic, with surfaces per dispatched phase or feature within that workspace. Maps naturally to the mental model: switching workspaces = switching epics. Single phases (plan/validate/release) get one surface; implement fan-out creates one surface per feature.
- **Agent execution: CLI-in-surface** — The cmux strategy creates a surface and sends `beastmode <phase> <slug>` into it via `cmux send-surface`. `phaseCommand` handles worktree creation, SDK dispatch, run logging, and release teardown inside the surface. The watch loop does not duplicate this logic for the cmux path.
- **Completion detection: marker file + fs.watch** — `phaseCommand` writes `.dispatch-done.json` to the worktree path on exit with session result data (exit status, cost, duration). The watch loop uses `fs.watch` on the worktrees directory for near-instant detection. No polling delay.
- **Marker scope: universal** — `phaseCommand` always writes `.dispatch-done.json` regardless of how it was launched (direct CLI, SDK, or cmux surface). Each strategy detects completion its own way: `SdkStrategy` resolves the in-process promise and also writes the marker; `CmuxStrategy` watches for the marker via `fs.watch`.
- **Notifications: errors and blocked gates only** — Desktop notifications via `cmux notify` fire only on phase failures and blocked human gates. No news is good news.
- **Configuration: dispatch-strategy field** — Single `cli.dispatch-strategy` field in config.yaml with values `sdk | cmux | auto`. `auto` means use cmux if available, fall back to SDK if not. No per-notification or per-cleanup config knobs.
- **Startup reconciliation: reconcile and adopt** — When `beastmode watch` starts, query cmux for existing workspaces matching known epic slugs. Live surfaces (process still running) get adopted into the DispatchTracker. Dead surfaces get closed. Empty workspaces get removed.
- **Cleanup timing: on release** — When the release phase completes and the worktree is removed, the watch loop closes the epic's cmux workspace and all its surfaces. Mirrors the worktree lifecycle exactly.
- **State reconciliation: strategy-scoped** — `SdkStrategy` reconciles state inline (existing behavior) and writes the completion marker. `CmuxStrategy` relies on `phaseCommand` (running inside the surface) to handle its own lifecycle. The watch loop detects completion via the marker and re-scans the epic.
- **Lifecycle coupling: worktree authoritative, cmux best-effort** — The git worktree is the durable resource. cmux surface cleanup is best-effort: if it fails, log a warning and continue. Stale surfaces get cleaned on next startup reconciliation.

## Testing Decisions

- **CmuxClient unit tests** — Mock the `cmux` binary (intercept Bun.spawn). Verify CLI argument construction, JSON response parsing, error handling for missing binary, and timeout behavior.
- **CmuxStrategy unit tests** — Mock CmuxClient. Verify workspace creation per epic, surface creation per dispatch, correct command construction for `send-surface`, marker file watching, and notification firing on errors/blocks.
- **SessionFactory tests** — Verify factory returns `CmuxStrategy` when config says `cmux` and cmux is available, `SdkStrategy` when config says `sdk`, and handles `auto` mode correctly (cmux available → CmuxStrategy, not available → SdkStrategy).
- **Startup reconciliation tests** — Mock CmuxClient.listWorkspaces(). Verify that existing workspaces matching epic slugs are adopted (live surfaces registered in DispatchTracker), dead surfaces are closed, and empty workspaces are removed.
- **Completion marker tests** — Verify `phaseCommand` writes `.dispatch-done.json` with correct schema on success, error, and cancellation. Verify `fs.watch` detection resolves the session promise.
- **SdkStrategy extraction tests** — Existing SDK dispatch tests continue to pass unchanged. Verify marker file is written after SDK session completes.
- **Prior art** — Existing tests in `cli/src/__tests__/` for state-scanner, watch loop, and dispatch-tracker establish the patterns: Bun test runner, mock file system, mock SDK responses.

## Out of Scope

- cmux installation, setup, or platform compatibility (macOS only — not our problem)
- cmux browser pane integration (interesting but not needed for pipeline monitoring)
- Cross-platform terminal multiplexer support (Linux/tmux/Zellij are separate features)
- Cost tracking dashboards (that's ccusage or OTLP territory)
- Inter-agent messaging through cmux (nobody has this, we won't invent it here)
- cmux plugin development (cmux-team, cmux-claude-pro are external projects)
- Status pills or progress bars in cmux sidebar (nice-to-have, deferred)
- Notification verbosity configuration (fixed at errors+blocks for now)
- Cleanup timing configuration (fixed at on-release for now)

## Further Notes

- The `SessionStrategy` extraction improves testability of the existing SDK dispatch path regardless of cmux. This refactor has standalone value.
- cmux's default auth (`cmuxOnly`) checks process ancestry. Since `beastmode watch` runs inside a cmux terminal, the CLI process inherits cmux ancestry and auth succeeds automatically.
- The `cmux send-surface` approach means agents get full interactive terminal capability — they can prompt for input if a human gate fires. This is better than the SDK path where interactive input is impossible.
- The `.dispatch-done.json` marker file pattern also benefits the SDK strategy by providing a persistent completion artifact that survives process crashes.

## Deferred Ideas

- **cmux status pills for pipeline progress** — Use `cmux set-status` to show phase progress, cost, and context percentage in the cmux sidebar. Requires defining a status key convention and updating the watch loop tick to push status updates.
- **cmux workspace templates** — Pre-defined layouts (e.g., "2-epic split", "watch + 4 workers") that auto-arrange surfaces when dispatching. Depends on cmux layout save/restore maturing.
- **Headless cmux for CI** — Run cmux in headless mode on Linux CI for pipeline visibility without a GUI. Depends on cmux adding Linux/headless support.
- **ccusage integration in cmux sidebar** — Show real-time cost burn rate per surface. Combine cmux status pills with ccusage data.
- **Notification verbosity config** — Add `cmux.notifications: errors | phase-complete | full` when users ask for it. Not needed yet.
- **Cleanup timing config** — Add `cmux.cleanup: on-release | manual | immediate` when users need it. On-release is the right default.
