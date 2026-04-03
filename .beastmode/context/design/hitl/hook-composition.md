## Context
HITL needs PreToolUse and PostToolUse hooks injected at dispatch time, but settings.json already has a committed Stop hook. Two hook files that serve different purposes need coexistence without conflict.

## Decision
Committed hooks (Stop) live in `settings.json`. Generated HITL hooks (PreToolUse on AskUserQuestion, PostToolUse on AskUserQuestion) live in `settings.local.json` which is gitignored. The CLI templates phase-specific prose into the hook config and writes it to `settings.local.json` before each dispatch. `cleanHitlSettings()` runs before `writeHitlSettings()` to prevent stale state between phases.

## Rationale
Separating committed vs generated hooks by file avoids merge conflicts and git noise. Different hook events (Stop vs PreToolUse/PostToolUse) means no override conflict. The clean-then-write pattern ensures each dispatch starts fresh, preventing a previous phase's HITL instructions from leaking into the next phase.

## Source
.beastmode/artifacts/design/2026-04-03-hitl-config.md
