# 1. Gather Context

## 1. Check Quick Exit

If the session was short or routine with nothing notable, say "Nothing to improve" and end.

## 2. Read Session Artifacts

Gather from this cycle:
- Design docs in `.agents/design/`
- Plan docs in `.agents/plan/`
- Status records in `.agents/status/`
- Conversation history

## 3. Collect Context File Paths

From the status file, collect all file references for retro agents:

1. **Related artifacts** — Design and Plan doc paths from the Context section
2. **Session Files** — JSONL paths from the Session Files section

## 4. Identify Prime Files

List all prime files that may need updates:
- META.md — writing guidelines, Rules Summary sync
- AGENTS.md — multi-agent safety, git workflow
- STACK.md — dependencies, versions, commands
- STRUCTURE.md — directory layout, file patterns
- CONVENTIONS.md — naming, code style, anti-patterns
- ARCHITECTURE.md — components, data flow, decisions
- TESTING.md — test strategy, coverage, commands
- CLAUDE.md — Rules Summary accuracy, project rules
