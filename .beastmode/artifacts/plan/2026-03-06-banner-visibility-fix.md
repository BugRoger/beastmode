# Banner Visibility Fix Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Restore the beastmode ASCII banner visibility by fixing the CLAUDE.md Prime Directive wording.

**Architecture:** Single-line edit to CLAUDE.md — add "display the banner output verbatim in a code block" instruction before the persona greeting instruction.

**Tech Stack:** Markdown

**Design Doc:** `.beastmode/state/design/2026-03-06-banner-visibility-fix.md`

---

### Task 1: Update CLAUDE.md Prime Directive

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `CLAUDE.md:6`

**Step 1: Edit the Prime Directive**

Replace line 6 of `CLAUDE.md`:

```
- When you see SessionStart hook output in your system context, greet in persona voice with context-awareness (time of day, project state)
```

With:

```
- When you see SessionStart hook output in your system context, display the banner output verbatim in a code block, then greet in persona voice with context-awareness (time of day, project state)
```

**Step 2: Verify the change**

Read `CLAUDE.md` and confirm:
1. Line contains "display the banner output verbatim in a code block"
2. Line still contains "greet in persona voice with context-awareness"
3. The persona adoption directive (line 5) is unchanged
4. The @import (line 1) is unchanged

No commit needed — unified commit at /release.
