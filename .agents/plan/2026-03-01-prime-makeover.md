# /prime Makeover Implementation Plan

**Goal:** Transform `/prime` from a generic codebase analyzer into a beastmode-optimized session starter with silent output.

**Architecture:** Single-phase skill that reads curated `.agents/prime/` knowledge plus situational context (status, active plans, git state). Fallback messages for non-bootstrapped projects.

**Tech Stack:** Markdown skill definitions, @ imports, bash commands for git exploration

**Design Doc:** [.agents/design/2026-03-01-prime-makeover.md](.agents/design/2026-03-01-prime-makeover.md)

---

### Task 0: Update SKILL.md manifest

**Files:**
- Modify: `skills/prime/SKILL.md`

**Step 1: Review current SKILL.md**

Read the existing file to understand structure.

**Step 2: Update SKILL.md content**

Replace content with:

```markdown
---
name: prime
description: Load codebase context — priming, context, understanding. Use when starting a new session. Reads prime docs and loads project knowledge.
---

# /prime

Load curated beastmode context for fast, silent session initialization.

## Phases

1. [Prime](phases/1-prime.md) — Load context, output confirmation
```

**Step 3: Verify under 50 lines**

Count lines. Expected: ~12 lines.

**Step 4: Commit**

```bash
git add skills/prime/SKILL.md
git commit -m "refactor(prime): simplify to single-phase beastmode-focused skill"
```

---

### Task 1: Create new 1-prime.md phase file

**Files:**
- Create: `skills/prime/phases/1-prime.md`

**Step 1: Create the new phase file**

```markdown
# 1. Prime

## 1. Check for Beastmode Bootstrap

Check if `.agents/prime/` directory exists.

**If missing:**
```
Print: "⚠ No .agents/prime/ found. Run `/bootstrap` to initialize."
```
Stop execution.

**If exists:** Continue.

## 2. Load Beastmode Core Context

Read all prime files (abort if any fail):
- `.agents/CLAUDE.md`
- `.agents/prime/META.md`
- `.agents/prime/AGENTS.md`
- `.agents/prime/STACK.md`
- `.agents/prime/STRUCTURE.md`
- `.agents/prime/CONVENTIONS.md`
- `.agents/prime/ARCHITECTURE.md`
- `.agents/prime/TESTING.md`

**If prime files exist but contain only placeholders:**
```
Print: "⚠ Prime files need content. Run `/bootstrap-discovery` to populate."
```
Continue (still load context).

## 3. Load Situational Context

Read if they exist (skip silently if missing):
- `.agents/status/STATUS.md` — Current state
- Most recent `.agents/design/*.md` — Active design
- Most recent `.agents/plan/*.md` — Active plan

## 4. Light Git Exploration

Run (skip silently if git unavailable):

```bash
git log -5 --oneline
```

```bash
git status
```

## 5. Output Confirmation

Print only:
```
✓ Primed
```
```

**Step 2: Verify file structure**

Ensure numbered steps (## 1., ## 2., etc.) and imperative voice.

**Step 3: Commit**

```bash
git add skills/prime/phases/1-prime.md
git commit -m "feat(prime): add single-phase beastmode context loader"
```

---

### Task 2: Delete old phase files

**Files:**
- Delete: `skills/prime/phases/1-analyze.md`
- Delete: `skills/prime/phases/2-report.md`

**Step 1: Remove old files**

```bash
rm skills/prime/phases/1-analyze.md
rm skills/prime/phases/2-report.md
```

**Step 2: Verify deletion**

```bash
ls skills/prime/phases/
```

Expected output: `1-prime.md` only

**Step 3: Commit**

```bash
git add -u skills/prime/phases/
git commit -m "refactor(prime): remove verbose analyze and report phases"
```

---

### Task 3: Manual verification

**Files:**
- None (verification only)

**Step 1: Test on bootstrapped project**

Run `/prime` in this beastmode project.

Expected:
- All prime files loaded into context
- Output: "✓ Primed"

**Step 2: Verify context loaded**

Ask Claude about project conventions after priming.

Expected: Claude can answer questions about:
- Stack (Claude Code plugin system)
- Conventions (UPPERCASE.md, kebab-case skills)
- Architecture (six-phase workflow)

**Step 3: Test fallback (if possible)**

On a project without `.agents/`:

Expected: "⚠ No .agents/prime/ found. Run `/bootstrap` to initialize."
