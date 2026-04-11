---
phase: plan
slug: unified-hook-context
epic: unified-hook-context
feature: env-prefix-helper
wave: 1
---

# env-prefix-helper

**Design:** `.beastmode/artifacts/design/2026-04-11-unified-hook-context.md`

## User Stories

1. As a hook author, I want all command hooks to receive the same `BEASTMODE_*` env vars, so that I can access phase/epic/feature context without parsing args or inferring from the filesystem.
6. As a CLI user running hooks manually, I want HITL hooks to accept positional args as a fallback when env vars are missing, so that `bunx beastmode hooks hitl-auto plan` still works standalone.

## What to Build

**Shared env prefix builder:** Extract a function that takes a hook context object (phase, epicId, epicSlug, featureId?, featureSlug?) and returns the inline env var prefix string. The function produces five env vars when feature context is present (`BEASTMODE_PHASE`, `BEASTMODE_EPIC_ID`, `BEASTMODE_EPIC_SLUG`, `BEASTMODE_FEATURE_ID`, `BEASTMODE_FEATURE_SLUG`) and three when absent (omitting feature vars entirely, not setting them to empty).

**Update all hook builders:** The existing `buildSessionStartHook` already uses inline env vars (`BEASTMODE_PHASE`, `BEASTMODE_EPIC`, `BEASTMODE_SLUG`). Replace its hand-rolled env string with a call to the shared builder, using the new var names (`BEASTMODE_EPIC_ID` replaces `BEASTMODE_EPIC`, `BEASTMODE_EPIC_SLUG` replaces `BEASTMODE_SLUG`). Remove old `BEASTMODE_EPIC` and `BEASTMODE_SLUG` env vars.

Update `buildPreToolUseHook` (hitl-auto) and `buildPostToolUseHook` (hitl-log) to prepend the env prefix to their command strings. Currently these pass phase as a positional arg only — they'll now get full env context.

Update `buildStopHook` (generate-output) to prepend the env prefix to its command string.

**Update hook context interfaces:** The `WriteSessionStartHookOptions` and `buildSessionStartHook` opts currently use `epic` and `slug` fields. Rename to `epicId` and `epicSlug` for clarity. All callers (runner.ts Step 3, watch loop if applicable) must pass the new field names.

**HITL hooks env var + fallback:** Update the hitl-auto and hitl-log hook handlers in the hooks command dispatcher to read `BEASTMODE_PHASE` from env vars first, falling back to the positional arg if the env var is missing. This preserves `bunx beastmode hooks hitl-auto plan` as a standalone invocation pattern.

**Update session-start env var reading:** The `runSessionStart` function currently reads `BEASTMODE_EPIC` and `BEASTMODE_SLUG`. Update to read `BEASTMODE_EPIC_ID` and `BEASTMODE_EPIC_SLUG` instead. The env vars are now set by the shared prefix builder.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Shared env prefix builder function exists and is exported
- [ ] Builder produces 5 env vars when feature context present, 3 when absent
- [ ] Old env var names (`BEASTMODE_EPIC`, `BEASTMODE_SLUG`) are removed from all command strings
- [ ] New env var names (`BEASTMODE_EPIC_ID`, `BEASTMODE_EPIC_SLUG`) are used in all command strings
- [ ] All four hook builders (session-start, hitl-auto, hitl-log, stop) use the shared prefix builder
- [ ] HITL auto reads phase from `BEASTMODE_PHASE` env var, falls back to positional arg
- [ ] HITL log reads phase from `BEASTMODE_PHASE` env var, falls back to positional arg
- [ ] `runSessionStart` reads `BEASTMODE_EPIC_ID` and `BEASTMODE_EPIC_SLUG` (no fallback)
- [ ] Unit tests verify prefix builder output for both with-feature and without-feature cases
- [ ] Unit tests verify HITL fallback behavior (env var preferred, positional arg when env missing)
