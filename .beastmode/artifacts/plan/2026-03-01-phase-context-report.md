# Phase Context Report Implementation Plan

**Goal:** Add a context report block to the end of each beastmode phase skill to help users decide whether to continue or start a new session.

**Architecture:** Create a shared template in `skills/_shared/CONTEXT-REPORT.md` that each phase skill imports via `@`. The template contains prose instructions telling Claude what to report, not a rigid format.

**Tech Stack:** Markdown with `@` import syntax (beastmode skill conventions)

**Design Doc:** [.agents/design/2026-03-01-phase-context-report.md](.agents/design/2026-03-01-phase-context-report.md)

---

### Task 0: Create `skills/_shared/` directory and context report template

**Files:**
- Create: `skills/_shared/CONTEXT-REPORT.md`

**Step 1: Create the shared directory and template file**

```markdown
# Context Report

At the end of this phase, print a context report including:
- Estimated token usage (system, conversation, total) and percentage of 200k limit
- Key artifacts currently loaded in context
- Current phase position in the workflow
- Handoff options: whether to continue or start a new session with the appropriate command
```

**Step 2: Verify the file was created**

Run: `cat skills/_shared/CONTEXT-REPORT.md`

Expected: File contents displayed

**Step 3: Commit**

```bash
git add skills/_shared/CONTEXT-REPORT.md
git commit -m "feat: add shared context report template"
```

---

### Task 1: Add context report to `/prime` skill

**Files:**
- Modify: `skills/prime/SKILL.md`

**Step 1: Add import at end of file**

Add after the final section (before any trailing blank lines):

```markdown

## Context Report

@../_shared/CONTEXT-REPORT.md
```

**Step 2: Verify the import reference is correct**

Run: `tail -10 skills/prime/SKILL.md`

Expected: Shows the new Context Report section with `@` import

**Step 3: Commit**

```bash
git add skills/prime/SKILL.md
git commit -m "feat(prime): add context report handoff"
```

---

### Task 2: Add context report to `/research` skill

**Files:**
- Modify: `skills/research/SKILL.md`

**Step 1: Add import at end of file**

Add after the final section:

```markdown

## Context Report

@../_shared/CONTEXT-REPORT.md
```

**Step 2: Verify**

Run: `tail -10 skills/research/SKILL.md`

**Step 3: Commit**

```bash
git add skills/research/SKILL.md
git commit -m "feat(research): add context report handoff"
```

---

### Task 3: Add context report to `/design` skill

**Files:**
- Modify: `skills/design/SKILL.md`

**Step 1: Add import at end of file**

Add after the final section (Native Task Integration):

```markdown

## Context Report

@../_shared/CONTEXT-REPORT.md
```

**Step 2: Verify**

Run: `tail -10 skills/design/SKILL.md`

**Step 3: Commit**

```bash
git add skills/design/SKILL.md
git commit -m "feat(design): add context report handoff"
```

---

### Task 4: Add context report to `/plan` skill

**Files:**
- Modify: `skills/plan/SKILL.md`

**Step 1: Add import at end of file**

Add after the final section (Session Status Tracking):

```markdown

## Context Report

@../_shared/CONTEXT-REPORT.md
```

**Step 2: Verify**

Run: `tail -10 skills/plan/SKILL.md`

**Step 3: Commit**

```bash
git add skills/plan/SKILL.md
git commit -m "feat(plan): add context report handoff"
```

---

### Task 5: Add context report to `/implement` skill

**Files:**
- Modify: `skills/implement/SKILL.md`

**Step 1: Add import at end of file**

Add after the final section (Session Status Tracking):

```markdown

## Context Report

@../_shared/CONTEXT-REPORT.md
```

**Step 2: Verify**

Run: `tail -10 skills/implement/SKILL.md`

**Step 3: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(implement): add context report handoff"
```

---

### Task 6: Add context report to `/verify` skill

**Files:**
- Modify: `skills/verify/SKILL.md`

**Step 1: Add import at end of file**

Add after the final section (Session Status Tracking):

```markdown

## Context Report

@../_shared/CONTEXT-REPORT.md
```

**Step 2: Verify**

Run: `tail -10 skills/verify/SKILL.md`

**Step 3: Commit**

```bash
git add skills/verify/SKILL.md
git commit -m "feat(verify): add context report handoff"
```

---

### Task 7: Add context report to `/retro` skill

**Files:**
- Modify: `skills/retro/SKILL.md`

**Step 1: Add import at end of file**

Add after the final section (Workflow):

```markdown

## Context Report

@../_shared/CONTEXT-REPORT.md
```

**Step 2: Verify**

Run: `tail -10 skills/retro/SKILL.md`

**Step 3: Commit**

```bash
git add skills/retro/SKILL.md
git commit -m "feat(retro): add context report handoff"
```

---

### Task 8: Verification — Test the feature manually

**Step 1: Run a quick phase to verify**

Start a fresh session and run any skill (e.g., `/prime` on a small codebase) to confirm the context report appears at the end.

**Step 2: Check that the report contains expected elements**

Expected output should include:
- Token usage estimates
- Loaded artifacts list
- Phase position
- Handoff options with copy-paste commands

---

## Notes for Implementer

- The `_shared` folder uses underscore prefix to distinguish from executable skills
- Import path is `@../_shared/CONTEXT-REPORT.md` (relative from each skill folder)
- No TDD here — this is markdown configuration, not code
- Each commit is small and focused on one skill
