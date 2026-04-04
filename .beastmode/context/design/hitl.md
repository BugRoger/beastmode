# HITL System

## Config Schema
- ALWAYS define HITL config under `hitl:` key in `config.yaml` with per-phase prose fields (`design:`, `plan:`, `implement:`, `validate:`, `release:`) — prose is interpreted as a prompt, not a DSL
- ALWAYS seed default HITL config with "always defer to human" for all phases at init — nothing automated until explicit opt-in
- ALWAYS support `hitl.model` (default: haiku) and `hitl.timeout` (default: 30s) top-level config — model and timeout are not per-phase

## Hook Composition
- ALWAYS keep committed hooks in `settings.json` (Stop hook) and generated hooks in `settings.local.json` (HITL PreToolUse/PostToolUse) — different events, no conflict
- ALWAYS gitignore `settings.local.json` — generated at dispatch time, no git noise
- ALWAYS clean HITL settings before writing new ones at each dispatch — `cleanHitlSettings()` before `writeHitlSettings()` prevents stale state between phases
- ALWAYS template the phase-specific HITL prose directly into the hook at dispatch time — no BEASTMODE_PHASE env var needed

## Prompt Hook
- ALWAYS use `PreToolUse` prompt hook targeting `AskUserQuestion` for HITL decisions — LLM evaluates the question against user's prose instructions
- ALWAYS return `permissionDecision: "allow"` with `updatedInput` for auto-answer, or `permissionDecision: "allow"` without `updatedInput` for defer-to-human — silent pass-through, no meta-explanation
- ALWAYS use all-or-nothing for multi-question batches — if any question needs human input, the entire batch passes through
- ALWAYS fail-open — hook errors (timeout, malformed response) pass the question through to the human

## Decision Logging
- ALWAYS log all decisions (auto and human) to `.beastmode/artifacts/<phase>/hitl-log.md` via `PostToolUse` command hook on `AskUserQuestion`
- ALWAYS tag entries as `auto` or `human` with full question text and selected answer — structured markdown for retro parsing
- ALWAYS fail-open on logging errors — silent exit(0), never block the session

## Retro Integration
- Retro context walker section "HITL Pattern Analysis" parses `hitl-log.md`, groups by question text, identifies repetitive human decisions (2+ same answer), and generates copy-paste `config.yaml` snippets — organic feedback loop from manual toward automated
- NEVER require the user to learn the config format — retro produces ready-to-paste snippets

## File Permission Hooks
- ALWAYS use `PreToolUse` prompt hooks targeting `Write` and `Edit` for file permission decisions — category-based prose from `file-permissions:` config, not phase-based
- ALWAYS include `if`-field conditions on file-permission hooks to restrict firing to category-specific paths (e.g., `.claude/**` for `claude-settings` category)
- ALWAYS write file-permission hooks alongside HITL hooks at dispatch time — same lifecycle (clean-then-write), same target (`settings.local.json`)
- ALWAYS log file-permission decisions via `PostToolUse` command hooks to the same HITL log file — unified audit trail for retro analysis
- ALWAYS use "always defer to human" as the default file-permission prose when no config is provided — same fail-safe default as HITL

## Subagent Scoping
- HITL applies to top-level phase sessions only — subagents do not inherit hooks from `settings.local.json`
- Subagents that need human input should be redesigned to not need it — HITL is not a subagent concern
