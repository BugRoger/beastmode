---
phase: plan
slug: dashboard-drilldown
epic: dashboard-drilldown
feature: message-mapper
wave: 1
---

# Message Mapper

**Design:** `.beastmode/artifacts/design/2026-04-02-dashboard-drilldown.md`

## User Stories

2. As a user viewing a feature list, I want to press Enter on an active feature to see a live structured log of the agent's output (text and tool calls), so that I can observe the agent working in real-time.

## What to Build

A message mapper module (~200 lines) that converts SDK message types into display-friendly structured log entries for terminal rendering. This is the translation layer between the SDK's wire format and what the agent log view renders.

Text deltas from partial assistant messages stream inline as text entries. Tool use blocks render as one-liners with tool name and primary argument: `[Read] cancel-logic.ts`, `[Edit] cancel-logic.ts:45-60`, `[Bash] bun test --filter cancel`. Tool results render as brief summaries: `> 3 tests passed`. Result messages produce a completion entry with cost and duration.

The mapper is a pure function module — takes an SDK message, returns zero or more display entries. No side effects, no subscriptions. The ring buffer in sdk-streaming calls the mapper when receiving emitter events.

Inspired by PostHog/code's `sdk-to-acp.ts` pattern but adapted for terminal rendering: shorter summaries, no protocol conversion, tool name extraction from content blocks.

Unit tests cover each SDK message type conversion, including edge cases: empty content blocks, unknown tool names, multi-tool turns, and text-only turns.

## Acceptance Criteria

- [ ] Maps SDKPartialAssistantMessage text deltas to streaming text entries
- [ ] Maps tool_use content blocks to one-liner tool call entries with name and primary arg
- [ ] Maps tool results to brief summary entries
- [ ] Maps SDKResultMessage to completion entry with cost/duration
- [ ] Handles edge cases: empty content, unknown tools, multi-tool turns
- [ ] Pure function — no side effects or subscriptions
- [ ] Unit tests cover all message type conversions
