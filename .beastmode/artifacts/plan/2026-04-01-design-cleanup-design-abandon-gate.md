---
phase: plan
slug: design-cleanup
epic: design-cleanup
feature: design-abandon-gate
wave: 1
---

# Design Abandon Gate

**Design:** .beastmode/artifacts/design/2026-04-01-c3cc89.md

## User Stories

1. As a user, I want to quit a design session early without leaving orphaned worktrees and manifests behind
2. As a user, I want the CLI to automatically clean up when a design session crashes (non-zero exit)
3. As a user, I want `beastmode status` to show no trace of abandoned designs (no ghost epics in plan phase)

## What to Build

Add a primary defense gate in the phase command's design execution path. After the interactive session returns (regardless of exit status), check whether a design output artifact was produced using the existing phase-output loader. If the output is missing — meaning the user quit, crashed, or abandoned the interview without producing a PRD — execute a cleanup sequence before returning:

1. Log the abandonment for audit trail
2. Remove the worktree directory and its associated git branch using the existing worktree removal module
3. Delete the manifest file entirely using the existing manifest store removal function (not a "cancelled" state — zero trace)
4. If GitHub integration is enabled and an epic issue was created, close it as `not_planned` using the `gh` CLI pattern established in the cancel command

The cleanup must run before `runPostDispatch()` is called, preventing the state machine from ever seeing an incomplete design. Both exit paths (zero and non-zero) converge on the same cleanup logic. The GitHub issue closure follows warn-and-continue semantics — failures log but never block.

## Acceptance Criteria

- [ ] Graceful design exit (exit 0) without output.json triggers full cleanup
- [ ] Crash/signal exit (non-zero) without output.json triggers full cleanup
- [ ] After cleanup: worktree directory removed, git branch deleted, manifest file deleted
- [ ] After cleanup: `beastmode status` shows no trace of the abandoned design
- [ ] GitHub epic issue closed as `not_planned` when github is enabled and issue exists
- [ ] GitHub closure failure logs warning but does not block cleanup
- [ ] Normal design completion (output.json present) is completely unaffected
- [ ] Cleanup is safe to call with partial artifacts (idempotent sub-operations)
