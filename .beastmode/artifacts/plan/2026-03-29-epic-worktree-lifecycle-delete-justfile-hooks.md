# delete-justfile-hooks

**Design:** .beastmode/state/design/2026-03-29-epic-worktree-lifecycle.md
**Architectural Decisions:** see manifest

## User Stories

1. As a developer, I want to run `beastmode design <topic>` and have the CLI create a worktree, launch an interactive Claude session inside it, and persist the worktree for subsequent phases, so that I don't need the Justfile or knowledge of worktree internals.

## What to Build

### Delete Justfile

Remove the top-level `Justfile` entirely. Its recipes (`design`, `plan`, `implement`, `validate`, `release`) are replaced by direct `beastmode <phase> <slug>` invocations through the CLI.

### Delete WorktreeCreate hook

Remove `hooks/worktree-create.sh` (the shell script that customizes worktree branch naming). Remove its entry from `hooks/hooks.json`. The SessionStart hook is preserved — only the WorktreeCreate hook is deleted.

### Update BEASTMODE.md template

The `skills/beastmode/assets/.beastmode/BEASTMODE.md` template (used when initializing new projects) references "External orchestrator (Justfile) manages worktrees and phase transitions". Update this line to reflect the new CLI-managed lifecycle: "CLI manages worktree lifecycle and phase transitions".

## Acceptance Criteria

- [ ] `Justfile` is deleted from the repository root
- [ ] `hooks/worktree-create.sh` is deleted
- [ ] `WorktreeCreate` entry is removed from `hooks/hooks.json`
- [ ] `SessionStart` hook entry is preserved in `hooks/hooks.json`
- [ ] BEASTMODE.md template no longer references Justfile
- [ ] No file in the repository imports or references the Justfile (except git history)
