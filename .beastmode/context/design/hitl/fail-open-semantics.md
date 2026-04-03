## Context
HITL hooks add an LLM call to every AskUserQuestion invocation. Hook failures (timeout, malformed response, logging errors) could block the pipeline if not handled carefully.

## Decision
All HITL hooks fail-open. PreToolUse prompt hook: uncertainty or error results in defer-to-human (the question passes through unchanged). PostToolUse command hook: any error results in silent exit(0) — the decision is not logged but the session continues. No retry logic in either hook.

## Rationale
The human is always a valid fallback. A failed auto-answer is equivalent to "I don't know, ask the human" which is the safe default. Logging is observability, not a critical path — missing a log entry is preferable to blocking the session. Fail-open aligns with the "always defer to human" default philosophy.

## Source
.beastmode/artifacts/design/2026-04-03-hitl-config.md
