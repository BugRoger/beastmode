---
phase: plan
slug: unified-hook-context
epic: unified-hook-context
feature: session-stop-rename
wave: 2
---

# session-stop-rename

**Design:** `.beastmode/artifacts/design/2026-04-11-unified-hook-context.md`

## User Stories

3. As the session-stop hook (renamed from generate-output), I want to read `BEASTMODE_EPIC_SLUG` from env vars instead of inferring the worktree slug from `basename(repoRoot)`, so that the output filename derivation uses the same source as all other hooks.
7. As the codebase, I want the generate-output hook renamed to session-stop (`runSessionStop`, `session-stop` subcommand, Stop hook command string), so that the hook naming is symmetric with session-start.

## What to Build

**Rename generate-output module to session-stop:** Rename the module file from `generate-output.ts` to `session-stop.ts`. Update all import paths that reference the old module name. This includes at minimum: `hooks.ts` (command dispatcher), `session-start.ts` (imports `parseFrontmatter` from generate-output).

**Update hook subcommand:** In the hooks command dispatcher, rename the `generate-output` case to `session-stop`. Update the `VALID_HOOKS` constant to list `session-stop` instead of `generate-output`. Update the usage string.

**Update buildStopHook command string:** The `buildStopHook` function currently emits `bunx beastmode hooks generate-output`. Change to `bunx beastmode hooks session-stop`. The shared env prefix from wave 1 will already be prepended.

**Update cleanHitlSettings filter:** The `cleanHitlSettings` function filters Stop hooks by checking if the command string contains `"generate-output"`. Update the filter to match `"session-stop"` instead.

**Replace filesystem inference with env var:** In the hook handler (currently `runGenerateOutput`), remove the `isWorktree` detection logic (`statSync(".git").isFile()`) and `basename(repoRoot)` slug derivation. Instead, read `BEASTMODE_EPIC_SLUG` from the environment. If the env var is missing, exit with an error message (matching session-start's fail-fast behavior). Pass the slug to `generateAll` as the `worktreeSlug` parameter.

**Scope determination:** With the env var available, the scope can be set to `"changed"` when `BEASTMODE_EPIC_SLUG` is present (implying a worktree context), removing the need for `isWorktree` detection entirely.

**Rename the handler function:** `runGenerateOutput` becomes `runSessionStop` for consistency.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Module file renamed from `generate-output.ts` to `session-stop.ts`
- [ ] All import paths updated (hooks.ts, session-start.ts, any tests)
- [ ] `VALID_HOOKS` lists `session-stop` instead of `generate-output`
- [ ] Hook subcommand `session-stop` works: `bunx beastmode hooks session-stop`
- [ ] `buildStopHook` command string uses `session-stop`
- [ ] `cleanHitlSettings` Stop hook filter matches `session-stop`
- [ ] `runSessionStop` reads `BEASTMODE_EPIC_SLUG` from env var (no filesystem inference)
- [ ] Missing `BEASTMODE_EPIC_SLUG` causes non-zero exit with error message
- [ ] `isWorktree` detection and `basename(repoRoot)` inference removed entirely
- [ ] Unit tests for session-stop: verify slug from env var, verify error on missing env var
- [ ] Existing generate-output tests migrated to session-stop (updated imports, same assertions)
