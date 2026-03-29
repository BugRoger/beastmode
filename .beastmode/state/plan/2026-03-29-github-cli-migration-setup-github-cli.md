# setup-github-cli

**Design:** .beastmode/state/design/2026-03-28-github-cli-migration.md
**Architectural Decisions:** see manifest

## User Stories

4. As a project admin, I want `beastmode setup-github` to be a CLI command, so that bootstrap is consistent with the rest of the CLI interface.

## What to Build

Move the GitHub bootstrap from the skill subcommand (`skills/beastmode/subcommands/setup-github.md`) to a CLI command (`cli/src/commands/setup-github.ts`). The command performs the same 10-step bootstrap using the `github-client` module:

1. Verify `gh` CLI authentication
2. Verify current directory is a GitHub repo
3. Create all 12 labels (idempotent)
4. Create `Beastmode Pipeline` Projects V2 board (idempotent)
5. Configure Pipeline field with 7 single-select options
6. Cache project metadata in-memory (no file-based cache write)
7. Link repo to project
8. Backfill existing epic/feature issues into project with correct status
9. Enable GitHub in config (`github.enabled: true`)
10. Print summary

The command is registered in the CLI router (`cli/src/index.ts`) as `beastmode setup-github`. It uses the `github-client` module for all `gh` operations.

The skill subcommand (`skills/beastmode/subcommands/setup-github.md`) is either deleted or reduced to a stub that tells the user to run the CLI command instead.

The file-based cache (`.beastmode/state/github-project.cache.json`) is no longer written. The lazy in-memory cache in `github-client` replaces it.

## Acceptance Criteria

- [ ] `beastmode setup-github` works as a CLI command
- [ ] All 10 bootstrap steps execute using the `github-client` module
- [ ] No file-based cache written to `.beastmode/state/github-project.cache.json`
- [ ] `github.enabled` is set to `true` in config on successful completion
- [ ] Skill subcommand is removed or replaced with a redirect message
- [ ] Backfill logic correctly maps existing issues to project board statuses
- [ ] Command is idempotent (safe to run multiple times)
