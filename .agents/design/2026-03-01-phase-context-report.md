# Phase Context Report

## Summary

Add a context report block to the end of each beastmode phase skill. Helps users decide whether to continue in the current session or start a new one.

## Problem

After completing a phase, users have no visibility into:
- How much context has been consumed
- What was accomplished
- How to hand off to a new session if needed

## Solution

Create `skills/_shared/CONTEXT-REPORT.md` with prose instructions. Each phase skill imports it at the end via `@skills/_shared/CONTEXT-REPORT.md`.

### Template Content

```markdown
## Context Report

At the end of this phase, print a context report including:
- Estimated token usage (system, conversation, total) and percentage of 200k limit
- Key artifacts currently loaded in context
- Current phase position in the workflow
- Handoff options: whether to continue or start a new session with the appropriate command
```

### Example Output

```
Context Report:

Tokens (estimated):
  System prompt:     ~4,000
  CLAUDE.md chain:   ~2,500
  Conversation:      ~8,200
  Total:             ~14,700 / 200,000 (7.4%)

Loaded artifacts:
  - /CLAUDE.md → .agents/CLAUDE.md → .agents/prime/META.md
  - .agents/design/2026-03-01-phase-context-report.md

Phase: design (3 of 7)
Messages: 12 exchanges

Handoff:
  Continue: Context is fresh, safe to proceed
  New session: /plan .agents/design/2026-03-01-phase-context-report.md
```

## Implementation

1. Create `skills/_shared/CONTEXT-REPORT.md`
2. Add `@skills/_shared/CONTEXT-REPORT.md` import to exit section of:
   - `skills/prime/SKILL.md`
   - `skills/research/SKILL.md`
   - `skills/design/SKILL.md`
   - `skills/plan/SKILL.md`
   - `skills/implement/SKILL.md`
   - `skills/verify/SKILL.md`
   - `skills/retro/SKILL.md`

## Design Decisions

- **Prose over template**: Instructions describe what to include, Claude determines format
- **`_shared` prefix**: Distinguishes from executable skills
- **`@` import pattern**: Consistent with existing beastmode conventions
