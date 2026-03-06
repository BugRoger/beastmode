# Visual Progress Language Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Add a visual progress language using Unicode block elements for phase indicators and context bars across all beastmode skills.

**Architecture:** Single specification file defines vocabulary. Each phase skill's 0-prime and checkpoint reference it for consistent rendering. Session start in BEASTMODE.md gets phase indicator alongside banner.

**Tech Stack:** Markdown skill definitions (no runtime dependencies)

**Design Doc:** `.beastmode/state/design/2026-03-06-visual-progress-language.md`

---

### Task 0: Create Visual Language Specification

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `skills/_shared/visual-language.md`

**Step 1: Create the spec file**

Write `skills/_shared/visual-language.md` with the following content:

```markdown
# Visual Language

Consistent visual vocabulary for progress and status displays. All visual elements use the Unicode block family, cohesive with the session banner.

## Character Vocabulary

| Symbol | Meaning | Usage |
|--------|---------|-------|
| `█` | Completed / full | Done phases, filled portion of bars |
| `▓` | Current / in-progress | Active phase |
| `░` | Pending / empty | Future phases, unfilled portion of bars |
| `▒` | Reserved | Future sub-phase granularity |

## Phase Indicator

Show workflow position using gradient density. Block width matches phase name width.

Determine current phase from the skill being executed:
- Phases before current → `█` (completed)
- Current phase → `▓` (in-progress)
- Phases after current → `░` (pending)

Phase order: design, plan, implement, validate, release.

**Render as plain text (NOT in a code block):**

Each segment width = length of phase name + trailing spaces to next segment. Segments separated by single space.

| Phase | Block Width |
|-------|-------------|
| design | 8 chars |
| plan | 7 chars |
| implement | 11 chars |
| validate | 10 chars |
| release | 9 chars |

Example at implement phase:

████████ ███████ ▓▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░ ░░░░░░░░░
design   plan    implement   validate   release

Example at design phase start:

▓▓▓▓▓▓▓▓ ░░░░░░░ ░░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░
design   plan    implement   validate   release

## Context Bar

Show token usage with full diagnostic breakdown. Render at checkpoint (end of phase).

**Bar:** 30 characters wide. Filled chars = `█`, empty chars = `░`. Calculate: filled = round(percentage / 100 * 30).

**Format (plain text, NOT code block):**

Context: ██████████████████░░░░░░░░░░░░ 58% (~116k/200k)
  System:        ~8k
  Conversation: ~92k
  Artifacts:    ~16k

Estimates are rough — prefix with `~`. Total is 200k context window.

**Handoff guidance** (print after the bar):
- Below 60% used: "Context is fresh. Safe to continue."
- 60-80% used: "Context is moderate. One more phase is reasonable."
- Above 80% used: "Context is heavy. Start a new session for the next phase."
```

**Step 2: Verify file exists and is well-formed**

Run: `head -5 skills/_shared/visual-language.md`
Expected: `# Visual Language` as the first heading

---

### Task 1: Update Context Report

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/context-report.md`

**Step 1: Replace the current prose-only content**

Replace entire file content with:

```markdown
# Context Report

At the end of this phase, print a visual context report.

@visual-language.md

## What to Print

1. **Phase indicator** — show current workflow position using the phase indicator format from visual-language.md
2. **Context bar** — show token usage with the full diagnostic format from visual-language.md
3. **Handoff guidance** — based on context percentage, recommend continue or new session with the appropriate next command
```

**Step 2: Verify**

Run: `cat skills/_shared/context-report.md`
Expected: Contains `@visual-language.md` reference and three numbered items

---

### Task 2: Update Design Phase 0-prime

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/design/phases/0-prime.md:1-7`

**Step 1: Add phase indicator to announce step**

Replace the `## 1. Announce Skill` section (lines 3-7) with:

```markdown
## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

Then print the phase indicator from @../_shared/visual-language.md showing **design** as the current phase.

@../_shared/persona.md
```

**Step 2: Verify**

Run: `head -9 skills/design/phases/0-prime.md`
Expected: Contains `visual-language.md` reference and "design as the current phase"

---

### Task 3: Update Plan Phase 0-prime

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/phases/0-prime.md:1-7`

**Step 1: Add phase indicator to announce step**

Replace the `## 1. Announce Skill` section (lines 3-7) with:

```markdown
## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

Then print the phase indicator from @../_shared/visual-language.md showing **plan** as the current phase.

@../_shared/persona.md
```

**Step 2: Verify**

Run: `head -9 skills/plan/phases/0-prime.md`
Expected: Contains `visual-language.md` reference and "plan as the current phase"

---

### Task 4: Update Implement Phase 0-prime

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/phases/0-prime.md:1-7`

**Step 1: Add phase indicator to announce step**

Replace the `## 1. Announce Skill` section (lines 3-7) with:

```markdown
## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

Then print the phase indicator from @../_shared/visual-language.md showing **implement** as the current phase.

@../_shared/persona.md
```

**Step 2: Verify**

Run: `head -9 skills/implement/phases/0-prime.md`
Expected: Contains `visual-language.md` reference and "implement as the current phase"

---

### Task 5: Update Validate Phase 0-prime

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/validate/phases/0-prime.md:1-7`

**Step 1: Add phase indicator to announce step**

Replace the `## 1. Announce Skill` section (lines 3-7) with:

```markdown
## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

Then print the phase indicator from @../_shared/visual-language.md showing **validate** as the current phase.

@../_shared/persona.md
```

**Step 2: Verify**

Run: `head -9 skills/validate/phases/0-prime.md`
Expected: Contains `visual-language.md` reference and "validate as the current phase"

---

### Task 6: Update Release Phase 0-prime

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/0-prime.md:1-7`

**Step 1: Add phase indicator to announce step**

Replace the `## 1. Announce Skill` section (lines 3-7) with:

```markdown
## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

Then print the phase indicator from @../_shared/visual-language.md showing **release** as the current phase.

@../_shared/persona.md
```

**Step 2: Verify**

Run: `head -9 skills/release/phases/0-prime.md`
Expected: Contains `visual-language.md` reference and "release as the current phase"

---

### Task 7: Update BEASTMODE.md Prime Directive

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/BEASTMODE.md:5-8`

**Step 1: Add phase indicator to Prime Directive**

Replace the Prime Directives section (lines 5-8) with:

```markdown
## Prime Directives

- BEFORE any other output in a session: if system context contains a SessionStart: hook message with block characters, display it verbatim in a code block. Then print the phase indicator showing the most recent phase (check `.beastmode/state/` for the latest artifact to determine position). Then greet in persona voice.
- Adopt the persona below for ALL interactions
```

**Step 2: Verify**

Run: `head -10 .beastmode/BEASTMODE.md`
Expected: Prime Directive mentions "phase indicator" and checking `.beastmode/state/`
