# Task Runner Lazy Expansion — Implementation Plan

**Goal:** Add lazy sub-step expansion to the task-runner so phase files show per-step TodoWrite progress.

**Architecture:** Three targeted additions to the execute loop pseudocode in a single markdown file. No new files, no structural changes.

**Tech Stack:** Markdown (prompt engineering)

**Design Doc:** `.beastmode/state/design/2026-03-04-task-runner-lazy-expansion.md`

---

## Task 1: Update Loop Entry Condition

**Files:**
- Modify: `skills/_shared/task-runner.md`

**Step 1: Change the task selection guard**

In `## 3. Execute Loop`, replace line 33:

```
  task = first task where status == "pending" AND parent is completed (or no parent)
```

With:

```
  task = first task where status == "pending" AND (parent is completed OR parent is in_progress OR no parent)
```

**Step 2: Verify**

Read `skills/_shared/task-runner.md` line 33. Expected: new guard condition with `parent is in_progress`.

---

## Task 2: Add Lazy Expansion Block

**Files:**
- Modify: `skills/_shared/task-runner.md`

**Step 1: Insert expansion logic after line 42, before "Execute the task content"**

Add these lines between `Update TodoWrite` and `Execute the task content`:

```
  # --- Lazy expansion ---
  IF task has a linked file (from [Link](path) syntax) AND task has no children yet:
    Read the linked file
    Parse ## N. Title headings into child tasks
    Insert children into todo list after parent (ids: "{parent.id}.{N}")
    Set first child to "in_progress"
    Update TodoWrite
    CONTINUE LOOP (children execute first, parent completes when all done)
```

**Step 2: Verify**

Read `skills/_shared/task-runner.md`. Expected: lazy expansion block appears between `Update TodoWrite` and `Execute the task content`.

---

## Task 3: Add Parent Completion Block

**Files:**
- Modify: `skills/_shared/task-runner.md`

**Step 1: Insert parent completion logic before the final `Update TodoWrite`**

Add these lines after the fail handling block, before the closing `Update TodoWrite`:

```
  # --- Parent completion ---
  IF task.parent exists AND all siblings completed:
    Set parent.status = "completed"
```

**Step 2: Verify**

Read `skills/_shared/task-runner.md`. Expected: parent completion block appears before `Update TodoWrite` near end of loop.
