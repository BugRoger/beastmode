# cli-entry-point-rewrite

**Design:** .beastmode/state/design/2026-03-28-cli-worktree-management.md
**Architectural Decisions:** see manifest

## User Stories

1. As a developer, I want to run `beastmode design <topic>` and have the CLI create a worktree, launch an interactive Claude session inside it, and persist the worktree for subsequent phases, so that I don't need the Justfile or knowledge of worktree internals.

2. As a developer, I want to run `beastmode plan <slug>` and have the CLI reuse the existing worktree from design (or create one if missing), run the SDK session inside it, and leave the worktree intact for implement, so that phase transitions are seamless.

## What to Build

Rewrite the CLI argument parser so that phase names (`design`, `plan`, `implement`, `validate`, `release`) are top-level commands instead of requiring the `run` subcommand. `beastmode <phase> <slug>` becomes the canonical syntax. The `run` subcommand is removed entirely.

The run command module already handles worktree creation and reuse via `worktree.create()` and `worktree.enter()`. This feature rewires the arg parser and index routing so phases land directly on that logic without the `run` intermediary.

The existing design runner (spawns `claude` CLI with cwd) and SDK runner (streams `query()` output) remain unchanged — only the routing layer above them changes.

Slug derivation must produce identical output to the skill's worktree-manager.md logic: lowercase, spaces to hyphens, strip non-alphanumeric characters. This parity is critical because skills use the same slugification to resolve artifacts by convention.

## Acceptance Criteria

- [ ] `beastmode design <topic>` creates a worktree and launches interactive Claude session
- [ ] `beastmode plan <slug>` reuses existing worktree (or creates if missing) and runs SDK session
- [ ] `beastmode implement <slug> <feature>` dispatches correctly
- [ ] `beastmode validate <slug>` and `beastmode release <slug>` route correctly
- [ ] `beastmode run <phase> <slug>` is no longer accepted (removed)
- [ ] Slugification in CLI matches worktree-manager.md derivation logic
- [ ] Argument parsing tests updated for new syntax
- [ ] Help output reflects new command structure
