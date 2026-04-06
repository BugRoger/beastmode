## Context
All hooks (Stop, HITL PreToolUse/PostToolUse, file-permission PostToolUse) are generated into `settings.local.json` at dispatch time. No static hook declarations exist in `settings.json` or `hooks/hooks.json` — static hooks were removed because they caused "Module not found" errors in non-beastmode projects where the plugin was installed.

## Decision
All hooks live in `settings.local.json` (gitignored), generated at dispatch time. `cleanHitlSettings()` runs before `writeHitlSettings()` to prevent stale state between phases. No static hook entries exist in committed settings files — the CLI is the sole hook authority.

The AskUserQuestion PreToolUse hook is a `type: "command"` entry invoking `hitl-auto.ts <phase>`. Prose is NOT baked into the hook entry — the script reads `config.yaml` at runtime via `loadConfig()` + `getPhaseHitlProse()`. The hook entry is stable; only the phase name argument differs between phases. File-permission PreToolUse hooks remain `type: "prompt"` — they still require LLM interpretation to map prose to allow/deny/defer decisions.

## Rationale
Separating committed vs generated hooks by file avoids merge conflicts and git noise. Different hook events (Stop vs PreToolUse/PostToolUse) means no override conflict. The clean-then-write pattern ensures each dispatch starts fresh.

Reading prose at runtime (not baking it into the hook) means config changes take effect on the next dispatch without regenerating hooks, and the hook entry shape is predictable regardless of prose content.

## Source
.beastmode/artifacts/design/2026-04-03-hitl-config.md
