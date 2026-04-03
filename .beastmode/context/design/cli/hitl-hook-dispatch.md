## Context
The CLI needs to inject HITL hooks into Claude Code sessions at dispatch time without polluting the committed settings.json (which owns the Stop hook) or requiring manual hook configuration.

## Decision
CLI writes HITL hooks to `.claude/settings.local.json` in the worktree. settings.local.json is gitignored. The CLI reads hitl.<phase> prose from config.yaml, templates it into a PreToolUse prompt hook targeting AskUserQuestion, and adds a PostToolUse command hook for decision logging. `cleanHitlSettings()` removes any existing HITL hooks before `writeHitlSettings()` writes the new ones. phase.ts calls both functions before dispatching, so all dispatch paths (manual CLI and watch loop) get HITL hooks.

## Rationale
settings.local.json is Claude Code's native override mechanism — it merges with settings.json at runtime. Using it for generated hooks keeps the committed config clean and avoids merge conflicts. The clean-then-write pattern prevents phase N's instructions from leaking into phase N+1 when the same worktree is reused across phases. Routing all dispatch through phase.ts guarantees uniform hook injection.

## Source
.beastmode/artifacts/design/2026-04-03-hitl-config.md
.beastmode/artifacts/validate/2026-04-03-hitl-config.md (Gate 6)
