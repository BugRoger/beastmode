## Context
HITL needs PreToolUse and PostToolUse hooks injected at dispatch time, but settings.json already has a committed Stop hook. Two hook files that serve different purposes need coexistence without conflict.

## Decision
Committed hooks (Stop) live in `settings.json`. Generated HITL hooks (PreToolUse on AskUserQuestion, PostToolUse on AskUserQuestion) live in `settings.local.json` which is gitignored. `cleanHitlSettings()` runs before `writeHitlSettings()` to prevent stale state between phases.

The AskUserQuestion PreToolUse hook is a `type: "command"` entry invoking `hitl-auto.ts <phase>`. Prose is NOT baked into the hook entry — the script reads `config.yaml` at runtime via `loadConfig()` + `getPhaseHitlProse()`. The hook entry is stable; only the phase name argument differs between phases. File-permission PreToolUse hooks remain `type: "prompt"` — they still require LLM interpretation to map prose to allow/deny/defer decisions.

## Rationale
Separating committed vs generated hooks by file avoids merge conflicts and git noise. Different hook events (Stop vs PreToolUse/PostToolUse) means no override conflict. The clean-then-write pattern ensures each dispatch starts fresh.

Reading prose at runtime (not baking it into the hook) means config changes take effect on the next dispatch without regenerating hooks, and the hook entry shape is predictable regardless of prose content.

## Source
.beastmode/artifacts/design/2026-04-03-hitl-config.md
