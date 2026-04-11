---
phase: plan
slug: unified-hook-context
epic: unified-hook-context
feature: session-metadata
wave: 3
---

# session-metadata

**Design:** `.beastmode/artifacts/design/2026-04-11-unified-hook-context.md`

## User Stories

2. As a skill, I want a structured metadata section in the SessionStart additionalContext that includes phase, epic ID/slug, feature ID/slug, parent artifact paths, and my output target path, so that I never derive filenames or parse the slash command string.

## What to Build

**Metadata section in additionalContext.** The `assembleContext` function in `session-start.ts` prepends a structured metadata block at the top of the `additionalContext` string, before the L0 context. The metadata block uses a fenced YAML-like format that skills can parse reliably:

```
---
phase: <phase>
epic-id: <entity ID like bm-f3a7>
epic-slug: <collision-proof slug like dashboard-redesign-f3a7>
feature-id: <feature entity ID, implement only>
feature-slug: <feature slug, implement only>
parent-artifacts:
  - <filename of parent phase artifact(s)>
output-target: <full relative path where the skill should write its artifact>
---
```

Feature fields are omitted when not in implement phase.

**SessionStartInput extension.** The `SessionStartInput` interface gains `epicId` and `featureId` optional fields. These are populated from the `BEASTMODE_EPIC_ID` and `BEASTMODE_FEATURE_ID` env vars (added by env-prefix-hooks in wave 1).

**Output target computation.** The metadata section includes the output target path, which is the full path (relative to repo root) where the skill should write its artifact. The CLI computes this from the date prefix, epic slug, feature slug, and phase directory. For example: `.beastmode/artifacts/implement/2026-04-11-dashboard-redesign-f3a7-auth-flow-1.md`. This eliminates filename derivation in skills.

**Parent artifact resolution.** The metadata section lists the filenames of resolved parent artifacts (the same ones that get included in the context body). For design phase, this is empty. For plan, it's the design artifact filename. For implement, it's the plan artifact filename. For validate, it's the list of implement artifact filenames.

**Env var reads.** The `runSessionStart` CLI entry point reads `BEASTMODE_EPIC_ID` and `BEASTMODE_FEATURE_ID` from `process.env` (in addition to the existing reads) and passes them into the input. These are optional — missing values are fine for phases where they don't apply.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] `additionalContext` starts with a structured metadata section before L0 context
- [ ] Metadata section includes phase, epic-id, epic-slug, and output-target
- [ ] Metadata section includes feature-id and feature-slug when in implement phase
- [ ] Metadata section omits feature fields when not in implement phase
- [ ] Metadata section lists parent artifact filenames
- [ ] Output target path is computed correctly for all phases
- [ ] `SessionStartInput` interface includes optional `epicId` and `featureId` fields
- [ ] `runSessionStart` reads `BEASTMODE_EPIC_ID` and `BEASTMODE_FEATURE_ID` from env
- [ ] Unit tests verify metadata section structure for design, plan, implement, and validate phases
- [ ] Unit tests verify output target path computation
