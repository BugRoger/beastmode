## Context
cmux surfaces must be created and destroyed in sync with the agent lifecycle to prevent stale terminals from accumulating.

## Decision
Clean up cmux workspace and all surfaces when an epic reaches release. Cleanup timing is fixed at on-release — no per-cleanup config knobs. Worktree is authoritative, cmux cleanup is best-effort: if cleanup fails, log warning and continue. Stale surfaces get cleaned on next startup reconciliation. On startup, reconcile existing workspaces: adopt live surfaces into DispatchTracker, close dead surfaces, remove empty workspaces.

## Rationale
Release cleanup mirrors the git worktree lifecycle. Best-effort coupling means cmux failures never block the pipeline. Startup reconciliation prevents double-dispatch when the watch loop restarts while agents are still running.

## Source
`.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md`
