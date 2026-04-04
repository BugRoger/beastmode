---
phase: plan
slug: fe70d5
epic: file-permission-hooks
feature: file-permission-logging
wave: 4
---

# File Permission Logging

**Design:** .beastmode/artifacts/design/2026-04-04-fe70d5.md

## User Stories

3. As a user, I want file permission decisions logged alongside HITL decisions so that retro can surface patterns and suggest config evolution.

## What to Build

PostToolUse command hooks for Write and Edit tools that log file permission decisions to the same HITL log file, creating a unified decision audit trail.

**PostToolUse hook generation:** Two new PostToolUse command hook entries (for Write and Edit matchers) that call a file permission logging script. These are generated alongside the PreToolUse hooks and follow the same lifecycle (written at dispatch, cleaned between dispatches).

**Log script:** A new log script (or extension to the existing `hitl-log.ts`) that handles Write/Edit tool output. It extracts the tool name, file path from `TOOL_INPUT`, and the permission decision from `TOOL_OUTPUT`. It appends a structured markdown entry to the same HITL log file at `.beastmode/artifacts/<phase>/hitl-log.md`.

**Log entry format:** Each entry includes:
- Timestamp heading (ISO 8601)
- Tag: "auto-allow", "auto-deny", or "deferred"
- Tool name (Write or Edit)
- File path
- Decision

The format is distinct from but compatible with the existing AskUserQuestion log entries, enabling retro to parse both in a single pass.

**Fail-silent:** The log hook exits 0 always — logging failure must never block Claude. Same pattern as the existing HITL log hook.

## Acceptance Criteria

- [ ] PostToolUse command hooks generated for Write and Edit matchers
- [ ] Log entries written to the same HITL log file as AskUserQuestion decisions
- [ ] Log entries include tool name, file path, and decision (auto-allow, auto-deny, deferred)
- [ ] Log entries have distinct format from AskUserQuestion entries but coexist in the same file
- [ ] Hook exits 0 on any error (fail-silent)
- [ ] Unit tests cover log entry formatting and tag detection for file permission decisions
