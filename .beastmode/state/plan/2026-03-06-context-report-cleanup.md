# Context Report Cleanup Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Eliminate split-brain between visual-language.md and context-report.md by establishing clear authority boundaries.

**Architecture:** Two-file edit. visual-language.md becomes a pure reference spec (what things look like). context-report.md becomes a consumer/orchestrator (what to print at checkpoints, session management guidance). No new files, no import changes.

**Tech Stack:** Markdown

**Design Doc:** `.beastmode/state/design/2026-03-06-context-report-cleanup.md`

---

### Task 0: Clean up visual-language.md

**Wave:** 1
**Depends on:** -
**Parallel-safe:** true

**Files:**
- Modify: `skills/_shared/visual-language.md:58-61`

**Step 1: Remove handoff guidance from Context Bar section**

Remove lines 58-61 from `skills/_shared/visual-language.md`. These lines are:

```markdown
**Handoff guidance** (print as plain text AFTER the code block):
- Below 60% used: "Context is fresh. Safe to continue."
- 60-80% used: "Context is moderate. One more phase is reasonable."
- Above 80% used: "Context is heavy. Start a new session for the next phase."
```

The file should end after line 56: `Estimates are rough — prefix with `~`. Total is 200k context window.`

**Step 2: Verify visual-language.md is a pure reference spec**

Read the file. Confirm:
- Character vocabulary section present
- Phase indicator format present (with code block rendering)
- Context bar format present (with code block rendering)
- No handoff guidance thresholds
- No touchpoints table
- No choreography instructions (no "when to display" rules)

---

### Task 1: Clean up context-report.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/context-report.md`

**Step 1: Rewrite context-report.md**

Replace the entire content of `skills/_shared/context-report.md` with:

```markdown
# Context Report

At the end of this phase, print a visual context report.

@visual-language.md

## What to Print

1. **Phase indicator** — show current workflow position (from visual-language.md)
2. **Context bar** — show token usage (from visual-language.md)
3. **Handoff guidance** — based on context percentage, recommend continue or new session with the appropriate next command

## Handoff Thresholds

- Below 60% used: "Context is fresh. Safe to continue."
- 60-80% used: "Context is moderate. One more phase is reasonable."
- Above 80% used: "Context is heavy. Start a new session for the next phase."
```

Key changes from current version:
- Removed "Render a single code block containing" (rendering is owned by visual-language.md)
- Removed "After the code block, print as plain text" (rendering is owned by visual-language.md)
- Added "Handoff Thresholds" section (moved from visual-language.md)
- "What to Print" is now a clean list of *what*, not *how*

**Step 2: Verify no duplication across both files**

Read both files. Confirm:
- No instruction appears in both files
- Handoff thresholds only in context-report.md
- Rendering format only in visual-language.md
- `@visual-language.md` import still present in context-report.md

**Step 3: Verify import chain intact**

Confirm all 5 checkpoint files still import context-report.md (no changes needed to these files):
- `skills/design/phases/3-checkpoint.md` → `@../_shared/context-report.md`
- `skills/plan/phases/3-checkpoint.md` → `@../_shared/context-report.md`
- `skills/implement/phases/3-checkpoint.md` → `@../_shared/context-report.md`
- `skills/validate/phases/3-checkpoint.md` → `@../_shared/context-report.md`
- `skills/release/phases/3-checkpoint.md` → `@../_shared/context-report.md`
