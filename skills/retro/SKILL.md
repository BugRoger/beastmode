---
description: Session retrospective for self-improvement - retro, wrap up, lessons learned, improve instructions, what did we learn
---

# Session Retrospective

Analyze the current development cycle to improve agent instructions and keep workflow documentation current.

## Process

Run phases in order. Each phase is conversational — wait for feedback before proceeding.

1. **[Retro](references/retro.md)** — Gather context, parallel prime review, session findings, apply changes
2. **[Engineering Dance Off](references/engineering-dance-off.md)** — Optional deep analysis for substantial changes

## What Gets Reviewed

**Prime Files (in parallel):**
- META.md — writing guidelines, Rules Summary sync
- AGENTS.md — multi-agent safety, git workflow
- STACK.md — dependencies, versions, commands
- STRUCTURE.md — directory layout, file patterns
- CONVENTIONS.md — naming, code style, anti-patterns
- ARCHITECTURE.md — components, data flow, decisions
- TESTING.md — test strategy, coverage, commands
- CLAUDE.md — Rules Summary accuracy, project rules
- Any new prime files (via generic agent)

**Session Artifacts:**
- Design docs from this cycle
- Plan docs from this cycle
- Session records in `.agents/status/`
- Conversation history

## Quick Exit

If the session was short or routine with nothing notable, say "Nothing to improve" and end.

## References

- [agents/common.md](agents/common.md) — Shared agent instructions
- [agents/meta.md](agents/meta.md) — META.md review prompts
- [agents/agents.md](agents/agents.md) — AGENTS.md review prompts
- [agents/stack.md](agents/stack.md) — STACK.md review prompts
- [agents/structure.md](agents/structure.md) — STRUCTURE.md review prompts
- [agents/conventions.md](agents/conventions.md) — CONVENTIONS.md review prompts
- [agents/architecture.md](agents/architecture.md) — ARCHITECTURE.md review prompts
- [agents/testing.md](agents/testing.md) — TESTING.md review prompts
- [agents/claude-md.md](agents/claude-md.md) — CLAUDE.md review prompts
- [agents/generic.md](agents/generic.md) — Generic fallback prompts

## Context Report

@../_shared/CONTEXT-REPORT.md
