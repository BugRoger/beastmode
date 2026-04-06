## Context
Hook builder functions in the CLI generate command strings that invoke hook handlers (hitl-auto, hitl-log, generate-output). The command paths must resolve correctly regardless of CWD, worktree context, symlink configuration, or machine identity.

## Decision
All hook builders emit `bunx beastmode hooks <name> [phase]` as the command string. No absolute paths, no `resolve(import.meta.dir)`, no shell substitution. The CLI binary resolves at runtime via PATH through `bunx`. A `hooks` dispatch command (`cli/src/commands/hooks.ts`) routes subcommands to handler functions imported from `cli/src/hooks/` modules. Hook modules are pure library exports with no `import.meta.main` entry points.

Script-internal usage of `git rev-parse --show-toplevel` in the dispatch command (for locating `.beastmode/` artifacts and config at runtime) is preserved -- those correctly resolve the user's project root.

## Rationale
Absolute paths via `resolve(import.meta.dir)` broke across machines and worktrees -- the path encoded at settings-create time was only valid on the authoring machine. `bunx beastmode` resolves through PATH at execution time, making hook invocations portable across machines, worktrees, and installation paths. Single dispatch entry point eliminates the dual invocation problem (CLI vs direct script execution) and allows `import.meta.main` removal from hook modules.

## Source
.beastmode/artifacts/design/2026-04-06-cli-hook-commands.output.json
