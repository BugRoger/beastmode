# cancel-command

**Design:** .beastmode/state/design/2026-03-29-epic-worktree-lifecycle.md
**Architectural Decisions:** see manifest

## User Stories

5. As a developer, I want to run `beastmode cancel <slug>` to archive the branch tip, remove the worktree, delete the local branch, update the manifest to cancelled, and close the GitHub epic, so that abandoned epics are cleaned up explicitly.

## What to Build

### cancel subcommand

Add a new command to the CLI router: `beastmode cancel <slug>`. This command performs a full teardown of an abandoned epic's worktree and associated state.

### Cancellation flow

The cancel function orchestrates five cleanup steps in order:

1. **Archive branch tip** — call the existing `archive()` function to create a lightweight tag preserving the branch history
2. **Remove worktree** — call `remove()` with force flag to clean up the worktree directory, even if it has uncommitted changes
3. **Delete local branch** — the remove step handles branch deletion (existing behavior)
4. **Update manifest** — read the epic's manifest from `.beastmode/state/plan/`, set a `phase` field to `"cancelled"`, write it back
5. **Close GitHub epic** — if GitHub is enabled in config and the manifest has a `github.epic` number, close the issue as `not_planned` using the `gh` CLI with warn-and-continue error handling

### Argument parsing

Extend `parseArgs()` to recognize `cancel` as a valid command alongside the existing phases and utilities.

### Error handling

Each step uses warn-and-continue semantics — if a step fails (e.g., no worktree exists, no GitHub access), warn and continue to the next step. The cancel command should be safe to run multiple times (idempotent).

## Acceptance Criteria

- [ ] `beastmode cancel <slug>` archives the branch tip as `archive/<slug>/YYYY-MM-DD`
- [ ] `beastmode cancel <slug>` removes the worktree directory
- [ ] `beastmode cancel <slug>` deletes the local `feature/<slug>` branch
- [ ] `beastmode cancel <slug>` updates the manifest `phase` to `"cancelled"`
- [ ] `beastmode cancel <slug>` closes the GitHub epic as `not_planned` (when enabled)
- [ ] Cancel is idempotent — running twice doesn't error
- [ ] Cancel works even if some resources (worktree, branch) are already cleaned up
- [ ] `beastmode cancel` without slug prints usage error
