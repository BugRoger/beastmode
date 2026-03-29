# Phase Dispatch Unification

**Design:** .beastmode/state/design/2026-03-29-interactive-cli-sessions.md
**Architectural Decisions:** see manifest

## User Stories

1. As an operator running `beastmode plan my-epic`, I want to see an interactive Claude terminal so I can watch the planning process and understand what decisions Claude is making
2. As an operator running `beastmode validate my-epic`, I want the same interactive experience as design so all manual phases feel consistent
3. As an operator running `beastmode implement my-epic auth-module`, I want a single interactive session for the specified feature so I can monitor implementation and intervene if the agent goes off track
5. As a watch loop operator, I want the SDK runner preserved as a dispatch option so autonomous pipeline operation remains possible when the SDK is fixed

## What to Build

Rewire the phase command orchestrator so all five manual phase commands dispatch through the interactive runner. Currently, design uses an interactive runner, implement has its own fan-out logic, and plan/validate/release use the SDK runner. After this change, the dispatch is uniform: derive worktree slug, ensure worktree, enter worktree, spawn interactive claude, log run.

The implement fan-out is removed entirely. The `runImplementFanOut()` function, `FeatureDispatch` interface, `FanOutResult` interface, and any implement-specific branching in the phase command are deleted. Implement becomes a single-session command routed through the same interactive runner as every other phase.

Release teardown (archive worktree, squash-merge to main, remove worktree) is preserved and fires on successful interactive session completion, exactly as it does today.

The SDK runner module is preserved in the codebase for the watch loop. It is not imported or invoked by manual phase commands. The watch command continues using the SDK runner unchanged.

The phase command simplifies dramatically — no phase-specific branching except release teardown. All phases follow the same pipeline: ensure worktree, enter, spawn interactive runner, log result.

Tests verify all phases route through the interactive runner. Tests verify implement no longer triggers fan-out. Tests verify release teardown still fires on success. Tests verify SDK runner is only referenced by watch-related code.

## Acceptance Criteria

- [ ] All five manual phase commands (design, plan, implement, validate, release) dispatch through the interactive runner
- [ ] `runImplementFanOut()`, `FeatureDispatch`, and `FanOutResult` are removed
- [ ] No implement-specific branching remains in the phase command
- [ ] Release teardown (archive, merge, remove) fires on successful session completion
- [ ] SDK runner is preserved and only used by the watch loop
- [ ] Phase command is simplified to uniform dispatch (~80-100 lines)
- [ ] Run logging works correctly for all phases including single-session implement
- [ ] Tests verify uniform dispatch routing for all phases
- [ ] Tests verify fan-out code is removed (no references in phase command)
