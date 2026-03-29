## Problem Statement

Worktree management is fragmented across three systems: the Justfile (which calls `claude --worktree`), the WorktreeCreate shell hook (which customizes branch naming), and the CLI's `worktree.ts` module (which has create/enter/merge/remove but isn't the sole authority). This creates fragile indirection, inconsistent lifecycle behavior, and prevents the CLI from being the single entry point for phase execution.

## Solution

Consolidate all worktree management into the TypeScript CLI. The CLI owns the full worktree lifecycle: creation at first phase, persistence through intermediate phases, merge-coordinator for implement fan-out, and squash-merge plus removal at release. Delete the Justfile and WorktreeCreate hook. `beastmode <phase> <slug>` becomes the sole entry point for manual phase execution. Skills become completely worktree-blind — they run in whatever cwd the CLI provides and never know or care about worktree mechanics.

## User Stories

1. As a developer, I want to run `beastmode design <topic>` and have the CLI create a worktree, launch an interactive Claude session inside it, and persist the worktree for subsequent phases, so that I don't need the Justfile or knowledge of worktree internals.

2. As a developer, I want to run `beastmode plan <slug>` and have the CLI reuse the existing worktree from design (or create one if missing), run the SDK session inside it, and leave the worktree intact for implement, so that phase transitions are seamless.

3. As a developer, I want the watch loop (`beastmode watch`) to follow the same lifecycle semantics as manual `beastmode <phase>` — create-once, persist, merge-at-implement, squash-at-release — so that automated and manual execution behave identically.

4. As a developer, I want implement fan-out to create per-feature worktrees and have the merge-coordinator merge them back to the epic's feature branch after all features complete, so that parallel implementation converges cleanly.

5. As a developer, I want failed phases to leave the worktree as-is so I can retry the same phase without losing partial progress, so that error recovery is simple and idempotent.

## Implementation Decisions

- **Entry point**: `beastmode <phase> <slug>` replaces both `beastmode run <phase> <slug>` and `just <phase> <slug>`. The `run` subcommand is dropped.
- **Worktree lifecycle**: Create at first phase encounter, persist through all phases, squash-merge to main and remove at release completion.
- **Commit ownership**: Skills own checkpoint commits (`git add -A && git commit` inside the worktree). CLI owns branch creation (at worktree create) and squash-merge (at release teardown).
- **Skill awareness**: Skills are completely worktree-blind. The CLI sets `cwd` to the worktree path when spawning sessions. Skills discover their context from arguments and convention-based artifact globs.
- **Slugification**: The CLI's slug derivation must produce identical output to the skill's worktree-manager.md "Derive Feature Name" logic (lowercase, spaces to hyphens, strip non-alphanumeric).
- **Design phase**: CLI creates worktree, spawns `claude` with cwd pointing to the worktree (not `--worktree` flag). Interactive stdio inherited.
- **Non-design phases**: CLI creates/reuses worktree, passes cwd to SDK `query()`. Streaming output to terminal.
- **Implement fan-out**: Per-feature worktrees with slug `<epic>-<feature>`. Merge-coordinator merges features to epic branch sequentially with conflict simulation (`git merge-tree`) for optimal ordering.
- **Release teardown**: After release phase completes, CLI squash-merges epic feature branch to main, archives branch tip, removes worktree.
- **Error recovery**: Failed phases leave worktree dirty. Next run of same phase picks up and overwrites. Watch loop re-dispatches automatically.
- **Watch loop alignment**: Watch loop uses the same worktree.ts functions as manual `beastmode <phase>`. Same create-once, persist, merge-at-implement, squash-at-release lifecycle.
- **Hook removal**: Delete `hooks/worktree-create.sh`. Remove WorktreeCreate entry from `hooks/hooks.json`. Keep SessionStart hook.
- **Justfile deletion**: Delete entirely. CLI is the sole orchestration layer.

## Testing Decisions

- Existing `cli/test/worktree.test.ts` covers create/enter/merge/remove — extend to cover lifecycle semantics (create-once idempotency, persist-across-phases, release teardown)
- Existing `cli/test/merge-coordinator.test.ts` covers conflict simulation — extend to cover end-to-end implement fan-out merge flow
- Add integration test for the full manual phase lifecycle: design creates worktree -> plan reuses it -> implement fan-out creates sub-worktrees -> validate reuses epic worktree -> release merges and removes
- Test argument parsing for new `beastmode <phase> <slug>` syntax (existing `cli/tests/args.test.ts`)
- Test slugification parity between CLI and worktree-manager.md derivation logic

## Out of Scope

- Changes to skill phase logic (skills are worktree-blind, their internal behavior doesn't change)
- GitHub sync changes (checkpoint sync is unaffected by worktree ownership)
- Changes to the retro system
- Changes to the SessionStart hook
- Per-phase config for worktree behavior (all phases follow the same lifecycle)

## Further Notes

- The CLI already has most of the worktree logic in `cli/src/worktree.ts`. This is primarily a wiring task: connecting existing modules, removing the Justfile/hook indirection, and aligning the watch loop.
- The `--dangerously-skip-permissions` flag currently passed by the Justfile is handled by the CLI's `permissionMode: "bypassPermissions"` in the SDK runner and `--dangerously-skip-permissions` in the design runner's claude spawn.

## Deferred Ideas

- Interactive worktree cleanup command (`beastmode clean`) for removing stale worktrees
- Worktree status in `beastmode status` output (show which worktrees exist and their disk usage)
- Worktree sharing across multiple epics (currently 1:1 epic-to-worktree)
