---
phase: plan
slug: cli-restructure
epic: cli-restructure
feature: rebase-step
wave: 2
---

# Rebase Step

**Design:** .beastmode/artifacts/design/2026-04-03-cli-restructure.md

## User Stories

1. As an operator, I want feature branches to rebase onto main before each phase dispatch, so that merge distance doesn't accumulate across phases. (US 1)
2. As an operator, I want rebase failures to warn and proceed rather than block dispatch, so that stale-base scenarios don't halt the pipeline. (US 5)

## What to Build

Add a `rebase()` function to the `git/worktree.ts` module that rebases the current worktree branch onto local main. This function is a standalone pipeline step that will be wired into the unified pipeline runner in wave 3.

**Rebase behavior:**
- **Phases:** All except design (design creates a fresh worktree from origin/HEAD, so rebase is meaningless)
- **Target:** Local `main` branch (no network dependency — no fetch)
- **On conflict:** Abort the rebase (`git rebase --abort`), log a warning, return a result indicating stale-base
- **On success:** Log one line confirming rebase completed
- **On skip:** Log one line confirming skip (design phase)
- **Return type:** A result object indicating outcome: `success`, `skipped`, or `conflict`

**Logging:** Minimal — one line per outcome. Uses the existing logger module.

**No pipeline wiring yet** — that's wave 3. This feature just creates and tests the rebase function.

**Tests:**
- Success path: rebase completes cleanly, returns success
- Conflict path: rebase hits conflict, aborts, returns conflict with warning
- Design skip path: design phase skips rebase, returns skipped

## Acceptance Criteria

- [ ] `git/worktree.ts` exports a `rebase()` function
- [ ] Rebase targets local `main` — no network calls
- [ ] Design phase is skipped (returns `skipped` result)
- [ ] Conflicts trigger `git rebase --abort` and return `conflict` result with warning log
- [ ] Successful rebase returns `success` result with one-line log
- [ ] Three test cases: success, conflict-abort, design-skip
- [ ] `tsc --noEmit` passes
- [ ] `bun test` passes
