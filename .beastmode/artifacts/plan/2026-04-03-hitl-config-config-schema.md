---
phase: plan
slug: hitl-config
epic: hitl-config
feature: config-schema
wave: 1
---

# Config Schema

**Design:** `.beastmode/artifacts/design/2026-04-03-hitl-config.md`

## User Stories

1. As a user, I want per-phase HITL configuration in `config.yaml` so that I can control which decisions require my input and which can be auto-answered.
2. As a user, I want the HITL config to be prose interpreted as a prompt so that I can express nuanced decision rules in natural language without learning a DSL.
3. As a user, I want all phases to start with "always defer to human" so that nothing is automated until I explicitly opt in.

## What to Build

Add an `hitl:` section to the beastmode config system:

- **Type definition**: Add `HitlConfig` interface to the config module. Per-phase prose fields (`design`, `plan`, `implement`, `validate`, `release`) as optional strings, plus `model` (default: `"haiku"`) and `timeout` (default: `30`). Add `hitl` field to `BeastmodeConfig`.

- **YAML parsing**: Extend the simple YAML parser to handle the `hitl:` section. The parser already handles nested objects and string values — HITL prose values are leaf strings under `hitl.<phase>`. Multi-line prose is out of scope for the simple parser; single-line prose per phase is sufficient since the prompt template wraps it.

- **Config loading**: Extend `loadConfig()` to extract and validate the `hitl` section, applying defaults (model, timeout, and "always defer to human" prose for each phase).

- **Default seeding**: When `beastmode init` creates the skeleton `config.yaml`, include the default `hitl:` block with "always defer to human" for all five phases plus default model and timeout.

- **Quoted string support**: The YAML parser already strips surrounding quotes. Verify it handles the prose strings that users will write (which may contain colons, special characters). If the simple parser cannot handle a common prose pattern, document the limitation.

## Acceptance Criteria

- [ ] `HitlConfig` interface exists with per-phase string fields, model, and timeout
- [ ] `BeastmodeConfig` includes `hitl: HitlConfig`
- [ ] `loadConfig()` parses `hitl:` section from `config.yaml`
- [ ] Default config returns "always defer to human" for all phases
- [ ] Init skeleton includes the `hitl:` block with safe defaults
- [ ] Config types are exported for use by hook generation feature
