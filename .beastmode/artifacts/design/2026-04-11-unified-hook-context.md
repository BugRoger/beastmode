---
phase: design
slug: unified-hook-context
epic: unified-hook-context
---

## Problem Statement

CLI hooks pass context (phase, epic, feature) via three divergent mechanisms: inline env vars (SessionStart), positional CLI args (HITL), and filesystem inference (generate-output). Skills parse their context from slash command arguments and derive artifact filenames independently. The old `BEASTMODE_EPIC`/`BEASTMODE_SLUG` env vars are vestigial duplicates post collision-proof-slugs. There is no single source of truth for session context — each consumer re-derives what it needs from whatever's available.

## Solution

Unify all command hooks to use five env vars prepended inline to their command strings. The SessionStart hook passes these values plus resolved artifact paths and output targets as a structured metadata section in additionalContext. Skills read from the metadata section instead of parsing slash command args or deriving filenames. The generate-output hook is renamed to session-stop for symmetry and reads env vars instead of inferring from the filesystem. The store entity is pre-created before design dispatch so IDs are always available, and the reconcileDesign create-if-missing fallback is removed.

## User Stories

1. As a hook author, I want all command hooks to receive the same `BEASTMODE_*` env vars, so that I can access phase/epic/feature context without parsing args or inferring from the filesystem.
2. As a skill, I want a structured metadata section in the SessionStart additionalContext that includes phase, epic ID/slug, feature ID/slug, parent artifact paths, and my output target path, so that I never derive filenames or parse the slash command string.
3. As the session-stop hook (renamed from generate-output), I want to read `BEASTMODE_EPIC_SLUG` from env vars instead of inferring the worktree slug from `basename(repoRoot)`, so that the output filename derivation uses the same source as all other hooks.
4. As the pipeline, I want the store entity pre-created before design dispatch, so that `BEASTMODE_EPIC_ID` is always available from the first hook invocation regardless of phase.
5. As the reconcile module, I want the `addEpic` create-if-missing fallback removed from `reconcileDesign`, so that there is exactly one code path for entity creation (pre-dispatch) instead of two.
6. As a CLI user running hooks manually, I want HITL hooks to accept positional args as a fallback when env vars are missing, so that `bunx beastmode hooks hitl-auto plan` still works standalone.
7. As the codebase, I want the generate-output hook renamed to session-stop (`runSessionStop`, `session-stop` subcommand, Stop hook command string), so that the hook naming is symmetric with session-start.

## Implementation Decisions

- Five env vars on all command hooks: `BEASTMODE_PHASE`, `BEASTMODE_EPIC_ID` (entity ID like `bm-f3a7`), `BEASTMODE_EPIC_SLUG` (collision-proof slug like `dashboard-redesign-f3a7`), `BEASTMODE_FEATURE_ID` (feature entity ID like `bm-f3a7.1`, implement only), `BEASTMODE_FEATURE_SLUG` (feature slug like `auth-flow-1`, implement only). Feature vars are omitted (not set) when not in implement phase.
- Old env vars `BEASTMODE_EPIC` and `BEASTMODE_SLUG` are removed and replaced by `BEASTMODE_EPIC_ID` and `BEASTMODE_EPIC_SLUG`.
- Inline env var prefixing on command strings (existing SessionStart pattern) is extended to all command hooks: HITL auto, HITL log, session-stop. A shared helper function builds the env prefix from the hook context.
- LLM prompt hooks (file-permission PreToolUse) are unchanged — env vars don't apply to prompt-type hooks.
- HITL hooks read `BEASTMODE_PHASE` from env vars with positional arg as fallback for backwards compatibility. Session-start and session-stop require env vars (no fallback).
- SessionStart hook outputs a structured metadata section at the top of additionalContext containing: phase, epic ID, epic slug, feature ID (if applicable), feature slug (if applicable), resolved parent artifact filenames, and the output target path for the current phase. The rest of additionalContext remains unchanged (L0, L1, artifact contents, gate evaluation).
- Output target path in the metadata section tells the skill exactly where to write its artifact (e.g., `.beastmode/artifacts/implement/2026-04-11-dashboard-redesign-f3a7-auth-flow-1.md`), eliminating filename derivation in skills.
- Skills are updated to read from the metadata section instead of parsing slash command arguments. Each skill's checkpoint step uses the output target from metadata instead of constructing the path itself.
- The store entity is created by the pipeline runner before dispatch for design phase (currently it's created during reconciliation). The runner calls `store.addEpic()` at step 0 (before worktree setup) and passes the entity ID into the hook context. `reconcileDesign` is simplified to always expect the entity to exist — the `addEpic` create-if-missing fallback at reconcile.ts lines 167-173 is removed.
- generate-output is renamed to session-stop across the codebase: hook subcommand becomes `session-stop`, the runtime function becomes `runSessionStop`, the Stop hook command string becomes `bunx beastmode hooks session-stop`, and the VALID_HOOKS constant is updated. The module file is renamed from `generate-output.ts` to `session-stop.ts`.
- session-stop reads `BEASTMODE_EPIC_SLUG` from env vars for output filename derivation. The `basename(repoRoot)` inference path and the `isWorktree` detection logic are removed. If `BEASTMODE_EPIC_SLUG` is missing, session-stop exits with an error (matching session-start behavior).

## Testing Decisions

- Unit tests for the shared env prefix builder: verify all five vars are included when feature context is present, only three when absent.
- Unit tests for session-start metadata section: verify structured output includes all context fields and resolved artifact paths.
- Unit tests for session-stop with BEASTMODE_EPIC_SLUG: verify output filename uses the env var, verify error when env var is missing.
- Unit tests for HITL hooks: verify env var takes precedence over positional arg, verify positional arg fallback works.
- Integration test: full design-through-plan cycle verifying that the metadata section contains correct artifact paths and that the plan skill reads from metadata instead of slash command args.
- Prior art: existing tests in `cli/src/__tests__/` and `cli/src/hooks/` for hook behavior.

## Out of Scope

- Changes to LLM prompt hooks (file-permission) — they don't run shell commands.
- Subagent context propagation — subagents get what they need via parent prompt construction.
- Changes to the artifact frontmatter schema — frontmatter stays the same, only the filename derivation source changes.
- Store migration for existing epics — pre-creation only applies to new design dispatches.

## Further Notes

- The session-start hook already has `SessionStartInput` interface with `phase`, `epic`, `slug`, `feature`. This interface will be extended with `epicId` and `featureId` fields, and the existing `epic`/`slug` fields will be renamed for clarity.
- The `buildSessionStartHook` function in hitl-settings.ts already implements the inline env var pattern. The new shared helper extracts this pattern for reuse across all hook builders.
- Skills currently derive the date prefix for artifact filenames. With the output target in metadata, the CLI computes the full path including date prefix, giving the CLI full control over the naming convention.

## Deferred Ideas

None
