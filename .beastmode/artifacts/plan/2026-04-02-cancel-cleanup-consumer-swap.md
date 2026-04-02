---
phase: plan
slug: "086084"
epic: cancel-cleanup
feature: consumer-swap
wave: 2
---

# Consumer Swap — Rewire All Callers to Shared Cancel Module

**Design:** `.beastmode/artifacts/design/2026-04-02-cancel-cleanup.md`

## User Stories

2. As a dashboard user, I want the cancel action to perform the same full cleanup as the CLI command, so that I don't have to switch to the terminal to finish the job.

## What to Build

Rewire all three existing cancel implementations to use the shared cancel-logic module:

### CLI Cancel Command (`commands/cancel.ts`)
Replace the current 4-step inline implementation with a call to the shared cancel module. Wire up the `--force` flag from the parsed args. The command handler becomes a thin wrapper: parse args → call shared module → exit.

### Dashboard Cancel Action (`dashboard/actions/cancel-epic.ts`)
Replace the current state-machine-only implementation with a call to the shared cancel module. The dashboard caller still owns session abort (via dispatch tracker) — it aborts sessions first, then calls the shared module for full cleanup. The previous assumption that "dashboard is still running in worktree" is incorrect per the PRD — the dashboard runs from project root, so worktree removal is safe.

### Design Abandon (`commands/phase.ts`)
Replace the inline 3-step cleanup logic (worktree remove, manifest delete, GitHub close) with a call to the shared cancel module. Design-abandon is cancel at an earlier stage — most cleanup steps will be no-ops (no archive tag, no phase tags, possibly no artifacts beyond the design doc). The shared module's idempotent design handles this naturally. Force is always true for design-abandon (it's automatic, no prompt).

### Cleanup
Remove all dead code from the three callers:
- Inline `updateManifestCancelled()` and `closeGitHubEpic()` functions from cancel.ts
- State machine `CANCEL` event usage in cancel-epic.ts (manifest is deleted, not transitioned)
- Inline GitHub close logic from phase.ts

### Tests
Expand `cancel.test.ts` to cover:
- Full cleanup sequence with mocked filesystem and git operations
- Idempotent behavior (cancel twice, second run succeeds)
- `--force` flag integration
- Design-abandon calling shared cancel
- Manifest-not-found graceful handling

## Acceptance Criteria

- [ ] CLI `beastmode cancel <slug>` performs full 6-step cleanup via shared module
- [ ] Dashboard cancel action performs full cleanup (not just state change)
- [ ] Dashboard cancel still aborts sessions before calling shared module
- [ ] Design-abandon uses shared cancel module with force=true
- [ ] All inline cancel logic is removed from the three callers
- [ ] No more state machine CANCEL event usage for cancel flow (manifest is deleted)
- [ ] Tests cover full cleanup, idempotency, --force, design-abandon, and missing manifest
- [ ] Dashboard cancel no longer skips worktree removal
