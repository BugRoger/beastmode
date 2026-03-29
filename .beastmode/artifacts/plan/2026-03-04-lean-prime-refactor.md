# Lean Prime Refactor — Implementation Plan

**Goal:** Refactor all skill phases so 0-prime is read-only and 1-execute owns all side effects

**Architecture:** Move worktree creation/entry, codebase exploration, and environment setup from 0-prime into step 1 of 1-execute for all 5 workflow skills. Update the shared prime template to remove worktree logic.

**Tech Stack:** Markdown skill definitions (no code — pure prompt refactoring)

**Design Doc:** `.beastmode/state/design/2026-03-04-lean-prime-refactor.md`

---

## Task 1: Slim the shared prime template

**Files:**
- Modify: `skills/_shared/0-prime-template.md`

**Step 1: Remove worktree section**

Remove step 4 "Enter Cycle Worktree" entirely (the bash block and surrounding content). Renumber step 5 to step 4.

**Step 2: Verify**

Confirm file has 4 steps: Announce, Load, Research Trigger, Phase-Specific Setup. No bash blocks.

---

## Task 2: Refactor /design phases

**Files:**
- Modify: `skills/design/phases/0-prime.md`
- Modify: `skills/design/phases/1-execute.md`

**Step 1: Rewrite 0-prime.md**

Remove steps 4 (Create Feature Worktree), 5 (Explore Context), 6 (Ask Clarifying Questions). Keep steps 1-3 (Announce, Load, Research Trigger).

**Step 2: Rewrite 1-execute.md**

Prepend three new steps before existing content:
1. Create Feature Worktree (moved from prime step 4, with worktree-manager.md reference)
2. Explore Context (moved from prime step 5)
3. Ask Clarifying Questions (moved from prime step 6)

Then existing steps renumbered as 4, 5, 6.

**Step 3: Verify**

Confirm 0-prime has no bash blocks. Confirm 1-execute step 1 is worktree creation.

---

## Task 3: Refactor /plan phases

**Files:**
- Modify: `skills/plan/phases/0-prime.md`
- Modify: `skills/plan/phases/1-execute.md`

**Step 1: Rewrite 0-prime.md**

Remove steps 5 (Enter Feature Worktree) and 6 (Explore Codebase). Keep steps 1-4 (Announce, Load, Research, Read Design Doc).

**Step 2: Rewrite 1-execute.md**

Prepend two new steps before existing content:
1. Enter Feature Worktree (moved from prime step 5, with worktree-manager.md reference)
2. Explore Codebase (moved from prime step 6)

Then existing steps renumbered as 3, 4, 5.

**Step 3: Verify**

Confirm 0-prime has no bash blocks. Confirm 1-execute step 1 is worktree entry.

---

## Task 4: Refactor /implement phases

**Files:**
- Modify: `skills/implement/phases/0-prime.md`
- Modify: `skills/implement/phases/1-execute.md`

**Step 1: Rewrite 0-prime.md**

Remove steps 4 (Enter Feature Worktree), 5 (Prepare Environment), 6 (Load Task State). Keep steps 1-3 (Announce, Load, Read Plan).

**Step 2: Rewrite 1-execute.md**

Prepend three new steps before existing content:
1. Enter Feature Worktree (moved from prime step 4, with worktree-manager.md reference)
2. Prepare Environment (moved from prime step 5)
3. Load Task State (moved from prime step 6)

Then existing steps renumbered as 4, 5, 6.

**Step 3: Verify**

Confirm 0-prime has 3 steps. No bash blocks.

---

## Task 5: Refactor /validate phases

**Files:**
- Modify: `skills/validate/phases/0-prime.md`
- Modify: `skills/validate/phases/1-execute.md`

**Step 1: Rewrite 0-prime.md**

Remove step 3 (Enter Feature Worktree). Keep steps 1-2 (Announce, Load Context) and renumber step 4 (Identify Test Strategy) to step 3.

**Step 2: Rewrite 1-execute.md**

Prepend one new step before existing content:
1. Enter Feature Worktree (moved from prime step 3, with worktree-manager.md reference)

Then existing steps renumbered starting at 2.

**Step 3: Verify**

Confirm 0-prime has 3 steps. Worktree entry is step 1 of execute.

---

## Task 6: Refactor /release phases

**Files:**
- Modify: `skills/release/phases/0-prime.md`
- Modify: `skills/release/phases/1-execute.md`

**Step 1: Rewrite 0-prime.md**

Remove steps 4 (Enter Worktree) and 5 (Determine Version). Keep steps 1-3 (Announce, Load Context, Load Artifacts).

**Step 2: Rewrite 1-execute.md**

Prepend two new steps before existing content:
1. Enter Worktree (moved from prime step 4)
2. Determine Version (moved from prime step 5)

Then existing steps renumbered starting at 3.

**Step 3: Verify**

Confirm 0-prime loads artifacts (reads status file) but doesn't cd. Execute step 1 enters worktree.

---

## Task 7: Update architecture doc

**Files:**
- Modify: `.beastmode/context/design/architecture.md`

**Step 1: Update sub-phase anatomy**

In the Overview section, update the description of the standard sub-phase anatomy to clarify:
- 0-prime: Read-only phase (loads context, input artifacts, no side effects)
- 1-execute: Action phase (worktree entry is always step 1, then skill-specific work)

**Step 2: Verify**

Confirm architecture.md reflects the new prime/execute separation.
