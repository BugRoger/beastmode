---
phase: plan
slug: hitl-config
epic: hitl-config
feature: decision-logging
wave: 2
---

# Decision Logging

**Design:** `.beastmode/artifacts/design/2026-04-03-hitl-config.md`

## User Stories

4. As a user, I want a log of all auto-answered and human-answered questions so that I can review what happened during a pipeline run.

## What to Build

A PostToolUse command hook on `AskUserQuestion` that logs every decision to a structured markdown file:

- **Log hook module**: A CLI-owned TypeScript script invoked as a PostToolUse command hook. It receives `$TOOL_INPUT` (the original question) and `$TOOL_OUTPUT` (the response including answers). The script determines whether the answer was auto-generated (by the PreToolUse hook) or human-provided, then appends a structured entry to the log file. Detection heuristic: compare the tool input's original state to the output — if `updatedInput` was present in the PreToolUse response, the answer was auto; otherwise human.

- **Log format**: Append-only markdown at `.beastmode/artifacts/<phase>/hitl-log.md`. Each entry includes: timestamp, question text, options presented, answer selected, and tag (`auto` or `human`). Structured enough for retro to parse programmatically.

- **Hook registration**: The PostToolUse hook is added alongside the PreToolUse hook in the generated `settings.local.json`. Same dispatch-time generation, same cleanup lifecycle.

- **Phase detection**: The log path includes the current phase. The CLI templates the phase into the hook command at dispatch time (same approach as the PreToolUse hook — no env vars needed).

## Acceptance Criteria

- [ ] PostToolUse command hook registered for `AskUserQuestion` in `settings.local.json`
- [ ] Log entries written to `.beastmode/artifacts/<phase>/hitl-log.md`
- [ ] Each entry includes timestamp, question, options, answer, and auto/human tag
- [ ] Log is append-only (multiple questions in one session accumulate)
- [ ] Retro can parse the log format programmatically
- [ ] Hook fails silently (exit 0) on error — never blocks the session
