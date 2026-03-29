# justfile-hook-removal

**Design:** .beastmode/state/design/2026-03-28-cli-worktree-management.md
**Architectural Decisions:** see manifest

## User Stories

1. As a developer, I want to run `beastmode design <topic>` and have the CLI create a worktree, launch an interactive Claude session inside it, and persist the worktree for subsequent phases, so that I don't need the Justfile or knowledge of worktree internals.

2. As a developer, I want to run `beastmode plan <slug>` and have the CLI reuse the existing worktree from design (or create one if missing), run the SDK session inside it, and leave the worktree intact for implement, so that phase transitions are seamless.

3. As a developer, I want the watch loop (`beastmode watch`) to follow the same lifecycle semantics as manual `beastmode <phase>` — create-once, persist, merge-at-implement, squash-at-release — so that automated and manual execution behave identically.

## What to Build

Remove all legacy orchestration layers that are superseded by the CLI:

1. Delete the Justfile entirely. The CLI's `beastmode <phase> <slug>` replaces all Justfile recipes.

2. Delete `hooks/worktree-create.sh`. The CLI's `worktree.create()` in worktree.ts now owns branch creation logic. The shell hook's branch-existence check and `git worktree add` are already replicated in the TypeScript module.

3. Remove the `WorktreeCreate` entry from `hooks/hooks.json`. Keep the `SessionStart` hook entries intact — those are unrelated to worktree management.

4. Update any documentation or references that point to the Justfile or the worktree hook. The CLI is now the sole entry point for all phase execution.

## Acceptance Criteria

- [ ] Justfile deleted from repository root
- [ ] `hooks/worktree-create.sh` deleted
- [ ] `WorktreeCreate` entry removed from `hooks/hooks.json`
- [ ] `SessionStart` hook entries in hooks.json preserved unchanged
- [ ] No remaining references to Justfile commands in docs or code
- [ ] No remaining references to worktree-create.sh in docs or code
- [ ] CLI remains functional as sole orchestration entry point
