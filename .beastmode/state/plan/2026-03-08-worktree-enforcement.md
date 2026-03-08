# Worktree Enforcement Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Add three-layer worktree enforcement (L0 rule, HARD-GATE in phase files, Assert Worktree anti-rationalization) to prevent Claude from skipping mandatory worktree creation/entry.

**Architecture:** Seven file edits across three enforcement layers. All edits are independent text insertions — no shared dependencies, no logic changes. The HARD-GATE blocks use the existing `<HARD-GATE>` XML tag convention. The L0 rule uses the existing ALWAYS/NEVER bullet convention.

**Tech Stack:** Markdown only — no runtime dependencies.

**Design Doc:** `.beastmode/state/design/2026-03-08-worktree-enforcement.md`

---

### Task 0: Add L0 worktree rule to BEASTMODE.md

**Wave:** 1
**Depends on:** -
**Parallel-safe:** true

**Files:**
- Modify: `.beastmode/BEASTMODE.md:26`

**Step 1: Add worktree rule after the "Five phases" bullet**

In `.beastmode/BEASTMODE.md`, find:

```markdown
## Workflow

- Five phases: design -> plan -> implement -> validate -> release
```

Replace with:

```markdown
## Workflow

- Five phases: design -> plan -> implement -> validate -> release
- NEVER skip worktree creation — every task gets isolation, no exceptions
```

**Step 2: Verify**

Read `.beastmode/BEASTMODE.md` and confirm:
- The new bullet appears in the Workflow section
- No other sections were changed

---

### Task 1: Add HARD-GATE to design/phases/1-execute.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/design/phases/1-execute.md:1-5`

**Step 1: Insert HARD-GATE before step 1**

In `skills/design/phases/1-execute.md`, find:

```markdown
# 1. Execute

## 1. Create Feature Worktree

**MANDATORY — do not skip this step.**
```

Replace with:

```markdown
# 1. Execute

<HARD-GATE>
All work happens in a worktree. No exceptions.
Documentation, single-file edits, and "lightweight" tasks all require worktrees.
If you judge the task as too small for a worktree, you are wrong.
</HARD-GATE>

## 1. Create Feature Worktree

**MANDATORY — do not skip this step.**
```

**Step 2: Verify**

Read the file and confirm:
- HARD-GATE block appears between the heading and step 1
- The rest of the file is unchanged

---

### Task 2: Add HARD-GATE to plan/phases/0-prime.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/phases/0-prime.md:20-22`

**Step 1: Insert HARD-GATE before step 3**

In `skills/plan/phases/0-prime.md`, find:

```markdown
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**
```

Replace with:

```markdown
<HARD-GATE>
All work happens in a worktree. No exceptions.
Documentation, single-file edits, and "lightweight" tasks all require worktrees.
If you judge the task as too small for a worktree, you are wrong.
</HARD-GATE>

## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**
```

**Step 2: Verify**

Read the file and confirm HARD-GATE appears before step 3.

---

### Task 3: Add HARD-GATE to implement/phases/0-prime.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/phases/0-prime.md:20-22`

**Step 1: Insert HARD-GATE before step 3**

In `skills/implement/phases/0-prime.md`, find:

```markdown
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**
```

Replace with:

```markdown
<HARD-GATE>
All work happens in a worktree. No exceptions.
Documentation, single-file edits, and "lightweight" tasks all require worktrees.
If you judge the task as too small for a worktree, you are wrong.
</HARD-GATE>

## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**
```

**Step 2: Verify**

Read the file and confirm HARD-GATE appears before step 3.

---

### Task 4: Add HARD-GATE to validate/phases/0-prime.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/validate/phases/0-prime.md:20-22`

**Step 1: Insert HARD-GATE before step 3**

In `skills/validate/phases/0-prime.md`, find:

```markdown
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**
```

Replace with:

```markdown
<HARD-GATE>
All work happens in a worktree. No exceptions.
Documentation, single-file edits, and "lightweight" tasks all require worktrees.
If you judge the task as too small for a worktree, you are wrong.
</HARD-GATE>

## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**
```

**Step 2: Verify**

Read the file and confirm HARD-GATE appears before step 3.

---

### Task 5: Add HARD-GATE to release/phases/0-prime.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/0-prime.md:20-22`

**Step 1: Insert HARD-GATE before step 3**

In `skills/release/phases/0-prime.md`, find:

```markdown
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**
```

Replace with:

```markdown
<HARD-GATE>
All work happens in a worktree. No exceptions.
Documentation, single-file edits, and "lightweight" tasks all require worktrees.
If you judge the task as too small for a worktree, you are wrong.
</HARD-GATE>

## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**
```

**Step 2: Verify**

Read the file and confirm HARD-GATE appears before step 3.

---

### Task 6: Add anti-rationalization context to worktree-manager.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/worktree-manager.md:136-151`

**Step 1: Add known failure mode context before the Assert Worktree code block**

In `skills/_shared/worktree-manager.md`, find:

```markdown
## Assert Worktree

Guards against writing `.beastmode/` files from the main repo. Called before ANY write to `state/`, `context/`, or `meta/`.

Used by: all `3-checkpoint.md` phases (before writes), `retro.md` (before spawning agents), `release/1-execute.md` (before pre-merge work)
```

Replace with:

```markdown
## Assert Worktree

Guards against writing `.beastmode/` files from the main repo. Called before ANY write to `state/`, `context/`, or `meta/`.

> **Known failure mode:** Claude sometimes judges a task as "lightweight" or "documentation-only" and skips worktree creation, then writes state files directly to the main repo. This assertion exists specifically to catch that. There are no lightweight exceptions. Every task gets a worktree.

Used by: all `3-checkpoint.md` phases (before writes), `retro.md` (before spawning agents), `release/1-execute.md` (before pre-merge work)
```

**Step 2: Verify**

Read the file and confirm:
- The blockquote appears between the description and the "Used by" line
- The assertion code block is unchanged
