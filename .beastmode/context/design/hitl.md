# HITL System

## Config Schema
- ALWAYS define HITL config under `hitl:` key in `config.yaml` with per-phase prose fields (`design:`, `plan:`, `implement:`, `validate:`, `release:`) — prose is literal answer text, not an LLM prompt
- ALWAYS seed default HITL config with "always defer to human" for all phases at init — nothing automated until explicit opt-in

## Hook Composition
- ALWAYS generate all hooks (Stop, HITL PreToolUse/PostToolUse, file-permission PostToolUse) into `settings.local.json` at dispatch time — no static hook declarations in committed settings files
- ALWAYS gitignore `settings.local.json` — generated at dispatch time, no git noise
- ALWAYS clean HITL settings before writing new ones at each dispatch — `cleanHitlSettings()` before `writeHitlSettings()` prevents stale state between phases
- ALWAYS pass `EnvPrefixContext` to hook builders (`buildPreToolUseHook`, `buildPostToolUseHook`, `buildStopHook`, `buildSessionStartHook`) — context includes phase, epicId, epicSlug, and optional featureId/featureSlug; prose is read at runtime by the script from config.yaml, not templated into the hook entry

## AskUserQuestion Hook
- ALWAYS use `PreToolUse` command hook (`type: "command"`) targeting `AskUserQuestion` — static `hitl-auto.ts` script reads config prose at runtime and makes a binary defer-vs-auto-answer decision without LLM inference
- ALWAYS defer (produce no output) when prose is "always defer to human" or empty — silent pass-through, question reaches the human unchanged
- ALWAYS auto-answer with `permissionDecision: "allow"` + `updatedInput` when prose is any other value — sets `answer="Other"` and prose text in `annotations[questionText].notes` for every question in the batch
- ALWAYS fail-open — script catches all errors in a top-level try/catch and calls `process.exit(0)` unconditionally; missing env vars and config parse failures silently defer to human

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
