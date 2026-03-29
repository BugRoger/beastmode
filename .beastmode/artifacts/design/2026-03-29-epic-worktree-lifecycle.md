## Problem Statement

Worktree management is fragmented across three systems: the Justfile (which calls `claude --worktree`), the WorktreeCreate shell hook (which customizes branch naming), and the CLI's `worktree.ts` module (which has create/enter/merge/remove but isn't the sole authority). Skills reference worktree internals through `worktree-manager.md` imports, "worktree directory name" language, and — in the release phase — directly execute squash-merge operations that cross the worktree boundary. There is no cancellation path for abandoned epics. This fragmentation prevents the CLI from being the single entry point for worktree lifecycle management.

## Solution

Make the worktree a transaction around the epic. One worktree per epic, owned entirely by the CLI. Created lazily (first phase that needs it), persisted across all phases, squash-merged to main and removed at release, or archived and cleaned up on cancel. Skills become completely worktree-blind — they run in whatever cwd the CLI provides, receive the feature slug as an argument, and never derive slugs, reference worktree paths, or perform worktree-boundary operations. Delete the Justfile, WorktreeCreate hook, and `worktree-manager.md`. Add `beastmode cancel <slug>` for explicit epic cancellation with full cleanup.

## User Stories

1. As a developer, I want to run `beastmode design <topic>` and have the CLI create a worktree, launch an interactive Claude session inside it, and persist the worktree for subsequent phases, so that I don't need the Justfile or knowledge of worktree internals.

2. As a developer, I want to run `beastmode plan <slug>` and have the CLI reuse the existing worktree from design (or create one if missing), run the SDK session inside it, and leave the worktree intact for implement, so that phase transitions are seamless.

3. As a developer, I want the watch loop (`beastmode watch`) to follow the same lifecycle semantics as manual `beastmode <phase>` — create-once, persist, squash-at-release — so that automated and manual execution behave identically.

4. As a developer, I want failed phases to leave the worktree as-is so I can retry the same phase without losing partial progress, so that error recovery is simple and idempotent.

5. As a developer, I want to run `beastmode cancel <slug>` to archive the branch tip, remove the worktree, delete the local branch, update the manifest to cancelled, and close the GitHub epic, so that abandoned epics are cleaned up explicitly.

## Implementation Decisions

- **Worktree-as-transaction**: One worktree per epic. The worktree IS the epic's working context. Created before the first phase, persisted through all phases, removed after release or cancel. No per-feature worktrees.
- **Lazy idempotent creation**: Every phase calls `ensureWorktree(slug)` which creates if missing or reuses if exists. No separate create command. No explicit creation step before design.
- **Entry point**: `beastmode <phase> <slug>` is the sole entry point for manual phase execution. The `run` subcommand and Justfile are eliminated.
- **Skill worktree blindness**: Skills have zero knowledge of worktrees. The CLI sets `cwd` to the worktree path when spawning sessions. Skills receive the feature slug as an invocation argument and use it for artifact naming only.
- **Slug derivation**: CLI owns all slug derivation (slugify function). Skills never derive slugs — they receive them as arguments.
- **Implement fan-out**: Parallel SDK sessions share the single epic worktree. No per-feature worktrees, no per-feature branches, no merge-coordinator involvement. Git index lock conflicts from concurrent commits are accepted risk.
- **Release boundary**: The release skill is allowed to operate on main — it can squash-merge the feature branch to main, create the release commit, and tag the version. These are git operations, not worktree management. The "TRANSITION BOUNDARY" in the release skill stays. CLI owns only the worktree container cleanup after release completes: archive branch tip, remove worktree, delete feature branch.
- **Cancel command**: `beastmode cancel <slug>` performs full cleanup: archive branch tip, remove worktree (force), delete local feature branch, update manifest `phase` to `"cancelled"`, close GitHub epic as `not_planned` if enabled.
- **Error recovery**: Failed phases leave worktree dirty. Next run of same phase picks up where it left off. Watch loop re-dispatches automatically.
- **Watch loop alignment**: Watch loop uses the same `ensureWorktree()` path as manual `beastmode <phase>`. Identical lifecycle semantics.
- **Deletion targets**: Delete `Justfile`, `hooks/worktree-create.sh`, `skills/_shared/worktree-manager.md`. Remove `WorktreeCreate` entry from `hooks/hooks.json`. Keep `SessionStart` hook.
- **Skill cleanup**: Full sweep of ~16 skill files. Reword "worktree directory name" to "feature slug". Remove `@worktree-manager.md` imports. Remove worktree-specific language but keep the release skill's TRANSITION BOUNDARY and squash-merge to main (those are git operations, not worktree management). Update references to Justfile.
- **Design phase**: CLI creates worktree, spawns `claude` CLI with cwd pointing to the worktree (not `--worktree` flag). Interactive stdio inherited.
- **Non-design phases**: CLI creates/reuses worktree, passes cwd to SDK `query()`. Streaming output to terminal.
- **GitHub**: Stays as-is. No changes to GitHub sync in this epic. Checkpoint sync is unaffected by worktree ownership changes.

## Testing Decisions

- Extend existing `cli/test/worktree.test.ts` to cover: `ensureWorktree()` idempotency (create when missing, reuse when exists), `cancel()` full cleanup flow (archive + remove + branch-delete), `exists()` check
- Add integration test for the epic-as-transaction lifecycle: design creates worktree -> plan reuses it -> implement reuses it -> validate reuses it -> release merges and removes
- Test cancel flow: create worktree, cancel, verify archive tag exists, worktree removed, branch deleted
- Test argument parsing for `beastmode cancel <slug>` (extend `cli/test/args.test.ts`)
- Test that the release teardown in phase.ts correctly calls archive -> merge -> remove after successful release
- Verify skill files no longer contain worktree references (grep-based assertion in CI or as a manual check)
- Prior art: existing `cli/test/worktree.test.ts` for worktree operations, `cli/test/merge-coordinator.test.ts` for merge logic

## Out of Scope

- Changes to skill phase logic (skills are worktree-blind, their internal behavior doesn't change beyond removing worktree references)
- GitHub sync changes (handled separately)
- Changes to the retro system
- Changes to the SessionStart hook
- Per-phase config for worktree behavior (all phases follow the same lifecycle)
- Merge-coordinator changes (kept as-is, just not used for per-feature worktrees)
- cmux integration changes (cmux surfaces map to epics, not worktrees)

## Further Notes

- The CLI already has most of the worktree logic in `cli/src/worktree.ts` and the phase orchestration in `cli/src/commands/phase.ts`. This is primarily a simplification: remove the per-feature worktree path from implement, add ensureWorktree/cancel/exists, delete the Justfile/hook indirection, and sweep worktree language from skills.
- The `--dangerously-skip-permissions` flag currently passed by the Justfile is already handled by the CLI's `permissionMode: "bypassPermissions"` in the SDK runner and `--dangerously-skip-permissions` in the design runner's claude spawn.
- Parallel implement sessions sharing one worktree will occasionally hit git index lock conflicts. This is accepted — the skill or developer retries. The alternative (per-feature worktrees) adds significant complexity for marginal benefit.

## Deferred Ideas

- Interactive worktree cleanup command (`beastmode clean`) for removing stale worktrees
- Worktree status in `beastmode status` output (show which worktrees exist and their disk usage)
- Worktree sharing across multiple epics (currently 1:1 epic-to-worktree)
- Automatic stale worktree detection and cleanup in the watch loop
