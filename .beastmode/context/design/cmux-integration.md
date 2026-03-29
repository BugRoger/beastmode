# cmux Integration

## Communication Protocol
- ALWAYS use the `cmux` CLI binary with `--json` flag for cmux communication — no direct Unix socket programming
- A typed `CmuxClient` module wraps the CLI with methods: `ping()`, `newWorkspace()`, `newSplit()`, `sendSurface()`, `closeSurface()`, `listWorkspaces()`, `notify()`
- Process spawn overhead is negligible at dispatch-time frequency
- cmux's default auth (`cmuxOnly`) checks process ancestry — beastmode inherits cmux ancestry when running inside cmux

## Surface Model
- ALWAYS create one cmux workspace per active epic — switching workspaces = switching epics
- ALWAYS create one cmux surface per dispatched phase or feature within the workspace — one terminal per agent
- Agent commands sent via `cmux send-surface` which runs `beastmode <phase> <slug>` — CLI-in-surface execution model
- `phaseCommand` handles worktree creation, SDK dispatch, run logging, and release teardown inside the surface — the watch loop does not duplicate this logic for the cmux path
- Agents get full interactive terminal capability — can prompt for input at human gates

## Notifications
- ALWAYS fire desktop notifications only on phase failures and blocked human gates — no news is good news
- Notification policy is fixed — no per-notification verbosity config knobs
- Notifications use `cmux notify` command

## Lifecycle
- ALWAYS clean up cmux workspace and surfaces when an epic reaches release — mirrors git worktree lifecycle
- Cleanup timing is fixed at on-release — no per-cleanup config knobs
- Worktree is authoritative, cmux cleanup is best-effort — if cleanup fails, log warning and continue; stale surfaces get cleaned on next startup reconciliation
- On startup, reconcile existing cmux workspaces: adopt live surfaces into DispatchTracker, close dead ones, remove empty workspaces

## Optionality
- cmux is NEVER a hard dependency — `cmuxAvailable()` pings the cmux CLI to gate all cmux paths
- `cli.dispatch-strategy` config (sdk | cmux | auto) controls dispatch selection — `auto` uses cmux if available, falls back to SDK
- When cmux is unavailable or not configured, existing SDK dispatch path runs unchanged via `SdkStrategy`

## Completion Detection
- Stop hook ALWAYS generates output.json from artifact frontmatter when Claude finishes — universal completion signal regardless of dispatch strategy
- output.json is the sole completion marker — `.dispatch-done.json` is deleted
- `CmuxStrategy` detects completion via `fs.watch` on `artifacts/<phase>/` for `*.output.json` — near-instant, no polling
- `SdkStrategy` reads output.json after query() iterator completes

## State Reconciliation
- State reconciliation is strategy-scoped — each strategy handles its own completion path
- `SdkStrategy` reconciles state inline after query() completes — reads output.json, enriches manifest via manifest.ts
- `CmuxStrategy` relies on `phaseCommand` running inside the surface to handle its own lifecycle
- The watch loop detects completion via output.json and re-scans the epic

context/design/cmux-integration/communication-protocol.md
context/design/cmux-integration/surface-model.md
context/design/cmux-integration/notifications.md
context/design/cmux-integration/lifecycle.md
context/design/cmux-integration/optionality.md
context/design/cmux-integration/completion-detection.md
context/design/cmux-integration/state-reconciliation.md
