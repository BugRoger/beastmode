# Design: Banner Skill Preemption Fix

**Date:** 2026-03-06
**Status:** Approved

## Goal

Fix the session banner not printing when the user's first message is a skill invocation (e.g., `/design`, `/plan`). Skills preempt the Prime Directive greeting, making the banner invisible.

## Approach

Add a Step 0 "Session Banner Check" to `_shared/task-runner.md` that runs before any skill's task parsing. Remove the now-redundant Prime Directive from `BEASTMODE.md`. One mechanism, one owner.

## Root Cause

The v0.14.4 "banner visibility fix" addressed a wording regression in the Prime Directive but missed the structural issue: when a skill is invoked as the first message, the skill's execution (task-runner + phase files) consumes the entire response. The Prime Directive instruction to display the banner never fires because the skill's instruction set takes priority.

This is a **skill preemption** bug, not a wording bug.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Root cause | Skill preemption, not wording | Skills override L0 Prime Directives when invoked as first message |
| Fix location | `_shared/task-runner.md` Step 0 | Centralized; all skills inherit the fix automatically |
| Prime Directive | Remove banner display instruction from BEASTMODE.md | Eliminates conflicting/redundant instruction; task-runner is sole owner |
| ANSI handling | Strip escape codes before displaying | Hook outputs ANSI color codes; code blocks render them as garbage text |
| Hook script | No changes to `session-start.sh` | Hook output reaches system context correctly; display is the problem |

### Claude's Discretion

- Exact ANSI stripping regex pattern
- Exact wording of the "already displayed" detection logic
- Whether to include the tagline inside or outside the code block

## Components

### Modified Files

| File | Change |
|------|--------|
| `skills/_shared/task-runner.md` | Add Step 0: Session Banner Check before Step 1 (Parse Tasks) |
| `.beastmode/BEASTMODE.md` | Remove Prime Directive line about banner display |

### Step 0 Logic

```
## 0. Session Banner Check

Before parsing tasks, check if the system context contains a `SessionStart:`
hook message that includes banner output (block characters like █).

If found:
1. Extract the banner lines and tagline from the hook output
2. Strip any ANSI escape codes (sequences matching \033[...m)
3. Display the cleaned banner in a code block
4. Follow with a one-sentence persona greeting (context-aware per persona.md)
5. Then proceed to Step 1

If not found (no SessionStart in context, or banner already displayed earlier
in conversation): skip directly to Step 1.
```

## Acceptance Criteria

- [ ] Task-runner Step 0 checks for SessionStart banner in system context
- [ ] Banner displays in a code block before skill execution
- [ ] ANSI escape codes are stripped from the output
- [ ] Prime Directive about banner display removed from BEASTMODE.md
- [ ] No double-printing if banner was already displayed earlier in conversation

## Testing Strategy

- Start a new session with `/design` as first message -- banner should print before skill executes
- Start a new session with plain text first, then invoke `/design` -- banner should print once (from task-runner), not twice
- Verify ANSI codes don't appear in the code block output

## Deferred Ideas

- Investigate what happens in non-skill sessions (plain text first message) now that the Prime Directive is removed. The persona greeting may need a separate mechanism for those cases.
- ~~Consider making the tagline appear outside the code block for better visual separation.~~ (implemented: 2026-03-08)
