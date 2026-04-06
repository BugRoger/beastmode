## Context
HITL hooks add processing to every AskUserQuestion invocation. Hook failures could block the pipeline if not handled carefully.

## Decision
All HITL hooks fail-open. The `hooks` dispatch command (`cli/src/commands/hooks.ts`) wraps each handler in a top-level try/catch; `process.exit(0)` is always called regardless of handler success or failure. Failure modes (missing `TOOL_INPUT`, `git rev-parse` failure, config parse error, malformed JSON input) all produce no output, which the Claude Code hook runtime treats as defer-to-human. PostToolUse command hook: any error results in silent exit(0) — the decision is not logged but the session continues. No retry logic in any hook handler.

## Rationale
The human is always a valid fallback. A failed auto-answer is equivalent to "I don't know, ask the human" which is the safe default. Logging is observability, not a critical path — missing a log entry is preferable to blocking the session. Fail-open aligns with the "always defer to human" default philosophy. The command hook model eliminates LLM timeout as a failure mode; the remaining failure modes are all local file/process operations that fail fast and silently.

## Source
.beastmode/artifacts/design/2026-04-03-hitl-config.md
