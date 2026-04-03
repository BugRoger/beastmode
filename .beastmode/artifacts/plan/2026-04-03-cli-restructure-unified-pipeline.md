---
phase: plan
slug: cli-restructure
epic: cli-restructure
feature: unified-pipeline
wave: 3
---

# Unified Pipeline

**Design:** .beastmode/artifacts/design/2026-04-03-cli-restructure.md

## User Stories

1. As a developer, I want a single pipeline runner that both manual CLI and watch loop call, so that dispatch behavior is identical regardless of entry point. (US 2)

## What to Build

Create `pipeline/runner.ts` — a single ordered pipeline runner that both manual CLI (`commands/phase.ts`) and watch loop (`watch-command.ts`) call. Each entry point becomes a thin wrapper that selects the dispatch strategy and calls the runner.

**Pipeline steps in order:**

| Step | Domain Call | Notes |
|------|-----------|-------|
| 1 | `git.worktree.prepare` | Create/enter worktree |
| 2 | `git.worktree.rebase` | Rebase onto local main (skip for design) |
| 3 | `settings.create` | Write .claude/settings.local.json with hooks |
| 4 | `dispatch.run` | Run session (interactive or SDK or cmux or it2) |
| 5 | `artifacts.collect` | Read phase output.json |
| 6 | `manifest.reconcile` | Update manifest from phase results |
| 7 | `manifest.advance` | Advance phase, enrich metadata |
| 8 | `github.mirror` | One-way sync to GitHub |
| 9 | `git.worktree.cleanup` | Release only: archive + remove |

**Runner interface:**
- Takes a configuration object specifying: phase, epic, dispatch strategy, manifest reference
- Returns a result indicating pipeline outcome
- Each step is a plain function call (not a formal PipelineStep interface — that's deferred)

**Entry point thinning:**
- `commands/phase.ts`: Becomes a thin wrapper that parses CLI args, selects `interactive` strategy, calls `pipeline/runner.run()`
- `watch-command.ts`: `ReconcilingFactory`, `dispatchPhase()`, and `selectStrategy()` logic moves into `pipeline/runner.ts`. Watch loop becomes a thin wrapper that calls `pipeline/runner.run()` per dispatched epic.
- `post-dispatch.ts`: Absorbed into the runner — its reconcile + tag + sync logic becomes pipeline steps 5-8.

**What moves into runner.ts:**
- Worktree prepare logic from `commands/phase.ts` (ensureWorktree/enterWorktree)
- Rebase call (from wave 2's `git/worktree.rebase()`)
- Settings creation (already in `settings.ts`)
- Dispatch strategy selection and execution (from `watch-command.ts` selectStrategy + dispatchPhase)
- Post-dispatch reconciliation (from `post-dispatch.ts`)
- GitHub sync trigger (from `post-dispatch.ts`)
- Worktree cleanup for release (from `watch-command.ts` ReconcilingFactory)

**Tests:**
- All 9 steps execute in order (mock each domain call, verify sequence)
- Design phase skips rebase step
- Release phase runs cleanup step
- Integration test: manual CLI and watch loop produce identical pipeline step sequences

## Acceptance Criteria

- [ ] `pipeline/runner.ts` exists with a `run()` function implementing all 9 steps in order
- [ ] `commands/phase.ts` is a thin wrapper calling `pipeline/runner.run()` with interactive strategy
- [ ] `watch-command.ts` ReconcilingFactory/dispatchPhase/selectStrategy logic absorbed into runner
- [ ] `post-dispatch.ts` absorbed — its logic lives in runner steps 5-8
- [ ] Design phase skips rebase (step 2)
- [ ] Release phase runs cleanup (step 9)
- [ ] Non-release phases skip cleanup
- [ ] Both manual and watch entry points produce identical step sequences for the same input
- [ ] `tsc --noEmit` passes
- [ ] `bun test` passes
- [ ] File count: net reduction (post-dispatch.ts deleted, pipeline/runner.ts created)
