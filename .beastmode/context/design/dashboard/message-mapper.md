# Message Mapper

## Context
SDK async generators yield typed messages (partial assistant, complete assistant, tool progress, result) that need to be rendered as human-readable terminal log entries.

## Decision
A message mapper module (~200 lines) converts SDKMessage types into display-friendly log entries. Text deltas stream inline. Tool calls render as one-liners (`[Read] file.ts`, `[Edit] file.ts:45-60`, `[Bash] bun test`). Tool results show brief output. Inspired by PostHog/code's `sdk-to-acp.ts` conversion pattern, adapted for terminal rendering rather than protocol conversion.

## Rationale
Terminal space is constrained — tool calls need single-line summaries, not full JSON payloads. The PostHog/code pattern provides a mature reference for SDK message lifecycle tracking (tool use start, input, result) but targets protocol conversion. Adapting for terminal rendering means extracting display-relevant fields only: tool name, primary file argument, and brief result summary.

## Source
.beastmode/artifacts/design/2026-04-02-dashboard-drilldown.md
.beastmode/artifacts/implement/2026-04-02-dashboard-drilldown-message-mapper.md
