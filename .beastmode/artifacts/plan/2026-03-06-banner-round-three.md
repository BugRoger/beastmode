# Banner Round Three Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Make the session banner display by moving the instruction to BEASTMODE.md (L0, autoloaded) and removing the dead task-runner indirection.

**Architecture:** Two-file change. Add a BEFORE-priority Prime Directive to BEASTMODE.md. Remove the orphaned Session Banner Check from task-runner.md and renumber.

**Tech Stack:** Markdown

**Design Doc:** `.beastmode/state/design/2026-03-06-banner-round-three.md`

---

### Task 1: Add Banner Prime Directive to BEASTMODE.md

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `.beastmode/BEASTMODE.md:7-8`

**Step 1: Add the new first Prime Directive bullet**

In `.beastmode/BEASTMODE.md`, find the `## Prime Directives` section (line 7). Insert a new bullet before the existing "Adopt the persona" bullet:

```markdown
## Prime Directives

- BEFORE any other output in a session: if system context contains a SessionStart: hook message with block characters, display it verbatim in a code block. Then greet in persona voice.
- Adopt the persona below for ALL interactions
```

**Step 2: Verify**

Read `.beastmode/BEASTMODE.md` and confirm:
- The Prime Directives section has two bullets
- The banner bullet is first
- The "Adopt the persona" bullet is second and unchanged

### Task 2: Remove Session Banner Check from task-runner.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/task-runner.md:5-15`

**Step 1: Remove Step 1 (Session Banner Check)**

In `skills/_shared/task-runner.md`, delete the entire `## 1. Session Banner Check` section (lines 5-15):

```markdown
## 1. Session Banner Check

Before parsing tasks, check if the conversation's system context contains a `SessionStart:` hook message with banner output (look for block characters like `█`).

**If found AND no banner has been displayed earlier in this conversation:**
1. Extract the banner text and tagline from the hook output
2. Strip ANSI escape codes (sequences matching `\033[...m` or `\x1b[...m`)
3. Display the cleaned banner in a code block
4. Follow with a one-sentence persona greeting (context-aware per persona.md)

**If not found OR banner was already displayed:** skip to Step 2.
```

**Step 2: Renumber remaining steps**

Renumber all subsequent headings:
- `## 2. Parse Tasks` → `## 1. Parse Tasks`
- `## 3. Initialize TodoWrite` → `## 2. Initialize TodoWrite`
- `## 4. Execute Loop` → `## 3. Execute Loop`
- `## 5. Completion` → `## 4. Completion`

Verify no internal cross-references to old step numbers remain.

**Step 3: Verify**

Read `skills/_shared/task-runner.md` and confirm:
- No "Session Banner Check" section exists
- Steps are numbered 1-4 consecutively
- No dangling references to old step numbers
