---
phase: plan
slug: unified-hook-context
epic: unified-hook-context
feature: env-prefix-hooks
wave: 1
---

# env-prefix-hooks

**Design:** `.beastmode/artifacts/design/2026-04-11-unified-hook-context.md`

## User Stories

1. As a hook author, I want all command hooks to receive the same `BEASTMODE_*` env vars, so that I can access phase/epic/feature context without parsing args or inferring from the filesystem.
6. As a CLI user running hooks manually, I want HITL hooks to accept positional args as a fallback when env vars are missing, so that `bunx beastmode hooks hitl-auto plan` still works standalone.

## What to Build

**Shared env prefix builder.** Extract a single `buildEnvPrefix(ctx)` function that constructs the inline env var string from a hook context object. The context object contains phase, epicId, epicSlug, and optionally featureId and featureSlug. When feature fields are present (implement phase), all five env vars are included. When absent, only three vars are emitted. The old env var names (`BEASTMODE_EPIC`, `BEASTMODE_SLUG`) are replaced by the new names (`BEASTMODE_EPIC_ID`, `BEASTMODE_EPIC_SLUG`).

**Hook builder updates.** All four command hook builders call the shared env prefix builder:
- `buildSessionStartHook` — already uses inline env vars, switch to calling the shared helper with new var names
- `buildPreToolUseHook` (hitl-auto) — currently passes phase as a CLI positional arg, add env prefix to the command string
- `buildPostToolUseHook` (hitl-log) — currently passes phase as a CLI positional arg, add env prefix to the command string
- `buildStopHook` — currently has no context at all, add env prefix to the command string

The `WriteSessionStartHookOptions` interface gains `epicId` and `featureId` fields. The runner's step 3 passes the epic entity ID and feature entity ID into the hook options.

**HITL hooks env var + fallback.** The hook command dispatcher (`hooks.ts`) updates `runHitlAuto` and `runHitlLog` to read `BEASTMODE_PHASE` from `process.env` first, falling back to the positional arg `args[0]` if the env var is not set. This preserves backwards compatibility for standalone `bunx beastmode hooks hitl-auto plan` invocations.

**Clean functions.** Update `cleanHitlSettings` to match on the new command string patterns. The Stop hook filter currently matches on the string `"generate-output"` — this will be updated by the session-stop-rename feature in wave 2.

**PipelineConfig update.** The `PipelineConfig` interface already has `epicId?: string`. The runner passes this through to all hook builders. If `epicId` is not available (e.g., design phase before entity creation), the env prefix omits `BEASTMODE_EPIC_ID`.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] A shared `buildEnvPrefix` function exists and is tested with both 3-var (no feature) and 5-var (with feature) cases
- [ ] `buildSessionStartHook` uses the shared helper and emits `BEASTMODE_EPIC_ID` and `BEASTMODE_EPIC_SLUG` instead of `BEASTMODE_EPIC` and `BEASTMODE_SLUG`
- [ ] `buildPreToolUseHook` and `buildPostToolUseHook` prepend env vars to their command strings
- [ ] `buildStopHook` accepts context and prepends env vars to its command string
- [ ] HITL hooks read `BEASTMODE_PHASE` from env with positional arg fallback
- [ ] Old env var names (`BEASTMODE_EPIC`, `BEASTMODE_SLUG`) no longer appear in the codebase
- [ ] `WriteSessionStartHookOptions` includes `epicId` and `featureId` fields
- [ ] Unit tests verify env prefix output for both 3-var and 5-var cases
- [ ] Unit tests verify HITL fallback behavior (env var present → used, absent → positional arg used)
