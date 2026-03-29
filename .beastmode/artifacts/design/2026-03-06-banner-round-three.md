# Design: Banner Round Three — L0 Prime Directive

**Date:** 2026-03-06
**Status:** Approved

## Goal

Make the session banner display when a session starts. Third attempt. Prior fixes (v0.14.5 wording fix, v0.14.6 task-runner Step 0) both shipped and both failed.

## Approach

Restore the banner display instruction to BEASTMODE.md as the first Prime Directive bullet with aggressive BEFORE/FIRST wording. Remove the redundant (and non-functional) banner check from task-runner.md.

## Root Cause

The v0.14.6 fix added a Session Banner Check as Step 1 of `_shared/task-runner.md`. The instruction is correct. But it never fires because:

1. Every SKILL.md references task-runner via `@_shared/task-runner.md` in a HARD-GATE section
2. The `@` import in HARD-GATE does **not** auto-expand — it's just text telling Claude to manually read the file
3. By the time Claude reads task-runner.md (as one of many parallel file reads), it has already started executing skill phases
4. Step 1 (Session Banner Check) gets deprioritized and silently skipped

This is an **import indirection** bug. The instruction exists but lives behind a manual-read wall that skill execution jumps over.

## Prior Attempts

| Version | Fix | Why It Failed |
|---------|-----|---------------|
| v0.14.5 | BEASTMODE.md wording: "display verbatim in a code block" | Skills preempt L0 Prime Directives when invoked as first message |
| v0.14.6 | Task-runner Step 1: Session Banner Check | `@` import not auto-expanded; instruction dead on arrival |

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Root cause | `@` import indirection; task-runner instruction never fires for skills | Confirmed by tracing this session: banner in system context, task-runner has instruction, banner not shown |
| Fix location | BEASTMODE.md Prime Directives (L0) | Auto-expanded via CLAUDE.md `@` reference; always in context before skill content |
| Wording | Single bullet with BEFORE/FIRST language, explicit "display verbatim in a code block" | Must be unambiguous enough to survive skill preemption |
| Task-runner cleanup | Remove Step 1 (Session Banner Check), renumber remaining steps | Single owner principle; redundant backup removed per user choice |
| Non-skill sessions | Covered by same fix | L0 fires for all sessions, not just skill invocations |

### Claude's Discretion

- Exact ANSI stripping approach (if needed at all — banner in system context may not have ANSI codes)
- Persona greeting wording after banner display

## Components

### Modified Files

| File | Change |
|------|--------|
| `.beastmode/BEASTMODE.md` | Add first Prime Directive bullet: banner display with BEFORE/FIRST language |
| `skills/_shared/task-runner.md` | Remove Step 1 (Session Banner Check), renumber 2→1, 3→2, 4→3, 5→4 |

### BEASTMODE.md Change

```markdown
## Prime Directives

- BEFORE any other output in a session: if system context contains a SessionStart: hook message with block characters (█), display it verbatim in a code block. Then greet in persona voice.
- Adopt the persona below for ALL interactions
```

### Task-runner.md Change

Remove the entire "## 1. Session Banner Check" section (lines 5-15). Renumber:
- Old "## 2. Parse Tasks" → "## 1. Parse Tasks"
- Old "## 3. Initialize TodoWrite" → "## 2. Initialize TodoWrite"
- Old "## 4. Execute Loop" → "## 3. Execute Loop"
- Old "## 5. Completion" → "## 4. Completion"

## Acceptance Criteria

- [ ] BEASTMODE.md has a new first Prime Directive bullet with banner display instruction
- [ ] Task-runner.md Step 1 (Session Banner Check) is removed
- [ ] Task-runner.md steps renumbered (old 2→1, 3→2, 4→3, 5→4)
- [ ] New session with `/design` as first message shows the banner
- [ ] New session with plain text as first message shows the banner

## Testing Strategy

- Start new session, invoke `/design` as first message — banner should appear before skill execution
- Start new session, send plain text — banner should appear in greeting
- Start new session, send text first, then invoke skill — banner should appear once (not twice)

## Deferred Ideas

- Investigate whether the HARD-GATE `@` import could be made auto-expanding in the plugin system (would fix the indirection problem structurally)
- Consider if plugin.json could declare a "pre-skill hook" that fires before any skill content loads
