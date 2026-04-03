---
phase: plan
slug: hitl-config
epic: hitl-config
feature: hook-generation
wave: 2
---

# Hook Generation

**Design:** `.beastmode/artifacts/design/2026-04-03-hitl-config.md`

## User Stories

1. As a user, I want per-phase HITL configuration in `config.yaml` so that I can control which decisions require my input and which can be auto-answered.
2. As a user, I want the HITL config to be prose interpreted as a prompt so that I can express nuanced decision rules in natural language without learning a DSL.

## What to Build

CLI generates `settings.local.json` in the worktree before dispatching each phase session, injecting the HITL PreToolUse prompt hook:

- **Prompt template module**: A CLI-owned TypeScript module that takes the phase-specific HITL prose, model, and timeout as inputs and returns a complete `settings.local.json` object. The template structures the LLM prompt to: receive `$ARGUMENTS` (the full `AskUserQuestion` tool input), evaluate the question against the user's HITL prose, and return either auto-answer (`permissionDecision: "allow"` + `updatedInput` with populated `answers`) or defer (`permissionDecision: "allow"` with no `updatedInput`). Multi-question batches are all-or-nothing: if any question needs human input, the entire call passes through.

- **Settings composition**: The generated `settings.local.json` must preserve existing content (currently `enabledPlugins`). The CLI reads the current file, merges in HITL hooks under `hooks.PreToolUse`, and writes back. The Stop hook lives in `settings.json` (committed) and `hooks/hooks.json` (plugin) — no conflict since HITL uses a different event.

- **Dispatch integration**: The phase command reads `hitl.<phase>` from the loaded config, calls the template module, and writes `settings.local.json` to the worktree's `.claude/` directory before spawning the interactive runner. The settings file is cleaned between dispatches to prevent stale state.

- **Fail-open behavior**: The prompt template must instruct the model to defer on any error, ambiguity, or timeout. If the hook infrastructure itself fails, the question passes through to the human by default.

## Acceptance Criteria

- [ ] CLI writes `settings.local.json` with PreToolUse prompt hook before dispatch
- [ ] Hook targets `AskUserQuestion` tool only (matcher)
- [ ] Prompt template injects user's HITL prose and `$ARGUMENTS`
- [ ] Auto-answer returns `permissionDecision: "allow"` + `updatedInput` with answers
- [ ] Defer returns `permissionDecision: "allow"` with no `updatedInput`
- [ ] Multi-question batches are all-or-nothing
- [ ] Existing `enabledPlugins` in `settings.local.json` preserved
- [ ] `settings.local.json` cleaned before each dispatch
- [ ] Model and timeout configurable via `hitl.model` and `hitl.timeout`
