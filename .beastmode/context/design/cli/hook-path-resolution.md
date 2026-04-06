## Context
Hook builder functions in the CLI generate command strings that invoke TypeScript scripts (hitl-auto.ts, hitl-log.ts, generate-output.ts). The command paths must resolve correctly regardless of CWD, worktree context, or symlink configuration.

## Decision
All hook builders compute absolute script paths at write time using `resolve(import.meta.dir, "<script>.ts")` and embed them directly in the command string. No shell substitution (`$(git rev-parse --show-toplevel)`) or environment variables (`CLAUDE_PLUGIN_ROOT`) are used for path resolution.

## Rationale
Shell substitution resolves at hook execution time, which fails in worktrees (git rev-parse returns the wrong root) and non-standard CWD contexts. `CLAUDE_PLUGIN_ROOT` is broken upstream in Claude Code (issues #24529, #32486, #27145) with no reliable fix timeline. `import.meta.dir` is available at CLI write time, is always correct for locating the CLI's own scripts, and produces paths that are absolute and context-independent.

Script-internal usage of `git rev-parse --show-toplevel` in the hook entry point scripts themselves (generate-output.ts, hitl-auto.ts, hitl-log.ts) is deliberately preserved — those correctly resolve the user's project root to find `.beastmode/` artifacts and config at runtime.

## Source
.beastmode/artifacts/design/2026-04-06-fix-hook-paths.output.json
