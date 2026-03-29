## Problem Statement

Beastmode CLI phase commands (plan, implement, validate, release) use the Claude Agent SDK `query()` for dispatch, which is currently broken — sessions complete in under 1 second with no work done and no cost incurred. Even when SDK sessions did run, they were headless: the operator could see streamed text output but had no interactive terminal and no ability to intervene. The implement phase adds complexity with parallel fan-out that dispatches multiple SDK sessions per feature, compounding the visibility problem.

## Solution

All manual phase commands (`beastmode <phase> <slug> [args]`) spawn an interactive `claude` CLI process with inherited stdio, exactly like the design phase already does. This gives the operator a live terminal for every phase — they can watch Claude think, see tool calls, and interact if needed. The implement fan-out is removed; implement becomes a single-session command (`beastmode implement <epic> <feature>`). The SDK runner is preserved for the watch loop but left unfixed — that's a separate effort.

## User Stories

1. As an operator running `beastmode plan my-epic`, I want to see an interactive Claude terminal so I can watch the planning process and understand what decisions Claude is making
2. As an operator running `beastmode validate my-epic`, I want the same interactive experience as design so all manual phases feel consistent
3. As an operator running `beastmode implement my-epic auth-module`, I want a single interactive session for the specified feature so I can monitor implementation and intervene if the agent goes off track
4. As an operator, I want Ctrl+C to cleanly terminate any phase session so I can abort a stuck or misbehaving agent
5. As a watch loop operator, I want the SDK runner preserved as a dispatch option so autonomous pipeline operation remains possible when the SDK is fixed

## Implementation Decisions

- **Uniform dispatch for manual commands**: All five phases use the same runner — spawn `claude` CLI with `--dangerously-skip-permissions` and inherited stdio. The design runner pattern becomes the universal pattern.
- **Interactive runner generalization**: Rename/generalize `design-runner.ts` to `interactive-runner.ts`. Accept phase + args instead of just topic. Build the prompt as `/beastmode:${phase} ${args.join(" ")}`.
- **Uniform CLI command signature**: `beastmode <phase> <slug> [extra-args]`. Design gets topic as slug. Implement gets `<epic> <feature>`. Plan/validate/release get `<epic>`.
- **Implement fan-out removal**: Delete `runImplementFanOut()`, `FeatureDispatch` interface, and the implement-specific branching in `phase.ts`. Implement is no longer a special case in the CLI — it routes through the same interactive runner as every other phase.
- **Implement skill unchanged**: The implement skill already accepts `<epic> <feature>` arguments. The fan-out was a CLI concern, not a skill concern.
- **SDK runner preserved**: `sdk-runner.ts` stays in the codebase for the watch loop (`beastmode watch`). It is not invoked by manual commands. Fixing SDK dispatch is deferred to a separate effort.
- **Watch loop out of scope**: The watch loop continues using `SdkSessionFactory(dispatchPhase)`. Its broken state is acknowledged but not addressed in this PRD.
- **Permissions**: All phases run with `--dangerously-skip-permissions`. Skills are trusted. The operator can watch and Ctrl+C if something goes wrong.
- **Signal handling**: The design runner's SIGINT handling pattern (propagate to child, track cancelled status, exit 130) applies universally to all phases.
- **Phase command simplification**: `phaseCommand()` in `commands/phase.ts` becomes a simple pipeline: derive worktree slug -> ensure worktree -> enter worktree -> spawn interactive claude -> log run. No phase-specific branching except release teardown (archive, merge, remove).

## Testing Decisions

- **Interactive runner unit tests**: Verify prompt construction for each phase (`/beastmode:plan slug`, `/beastmode:implement epic feature`, etc.). Mock `Bun.spawn` to verify correct args, cwd, and stdio inheritance.
- **Phase command tests**: Verify all phases route through the interactive runner. Verify implement no longer triggers fan-out. Verify release teardown still fires on success.
- **Signal handling tests**: Verify SIGINT propagation and exit code 130 for cancelled sessions.
- **Prior art**: Existing tests in `cli/src/__tests__/` establish patterns. The design runner is already tested; extending those tests to the generalized runner should be straightforward.

## Out of Scope

- Fixing SDK `query()` dispatch — deferred to a separate effort
- Watch loop dispatch changes — stays on SDK
- Implement skill changes — skill already handles `<epic> <feature>`
- cmux integration — separate PRD (interactive-cmux-workspaces)
- Parallel feature dispatch — removed, not replaced
- Cost tracking in interactive sessions — `claude` CLI doesn't expose cost to the parent process

## Further Notes

- The 790ms plan completion time confirms SDK sessions are dying on startup. The interactive CLI approach sidesteps this entirely by using the battle-tested `claude` CLI binary.
- All `cost_usd` values in runs.json will be `null` for interactive sessions since the spawned `claude` process doesn't expose cost to the parent. This is acceptable — ccusage or API-side tracking covers this.
- The simplification is significant: `commands/phase.ts` drops from ~270 lines with fan-out logic to roughly 80-100 lines of uniform dispatch.

## Deferred Ideas

- **SDK dispatch fix**: Investigate why `query()` sessions die instantly. Likely an auth, config, or SDK version issue. Fix would re-enable watch loop and potentially offer a non-interactive dispatch option for manual commands.
- **Parallel implement via terminals**: When cmux integration lands, implement could dispatch features to parallel terminal panes. This restores parallelism with visibility.
- **Cost passthrough**: If the `claude` CLI adds a `--output-cost` flag or writes cost metadata, capture it for runs.json.
