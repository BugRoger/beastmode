# Lazy Task Expansion Implementation Plan

**Goal:** Fix task-runner.md so sub-phases expand lazily when entered, not eagerly at parse time.

**Architecture:** Three targeted edits to `skills/_shared/task-runner.md`: strengthen parse constraints (Step 1), clarify initialization scope (Step 2), add child collapse + depth limit (Step 3).

**Tech Stack:** Markdown prompt engineering

**Design Doc:** `.beastmode/state/design/2026-03-04-lazy-task-expansion.md`

---

## Task 1: Add Shallow Parse Constraint to Step 1

**Files:**
- Modify: `skills/_shared/task-runner.md`

**Step 1: Add opaque link rule after "Build task list with:" block**

Find the "Build task list with:" bullet list (ending with `parent` bullet). After that list, insert:

```markdown

**Linked items are opaque**: For items with `[Link](path)` syntax, create a single task entry. **Do NOT read or parse the linked file yet.** Store the path on the task for lazy expansion during execution.
```

**Step 2: Verify**

Read the file and confirm the new paragraph appears after the `parent` bullet and before `## 2.`

---

## Task 2: Clarify Initialization Scope in Step 2

**Files:**
- Modify: `skills/_shared/task-runner.md`

**Step 1: Replace Step 2 intro line**

Change:
```
Create TodoWrite entries for all tasks:
```
To:
```
Create TodoWrite entries for top-level tasks only (linked sub-phases are not yet expanded):
```

**Step 2: Verify**

Read the file and confirm "top-level tasks only" wording is present.

---

## Task 3: Add Depth Limit + Child Collapse to Step 3

**Files:**
- Modify: `skills/_shared/task-runner.md`

**Step 1: Add depth limit to lazy expansion block**

Change:
```
    Parse ## N. Title headings into child tasks
```
To:
```
    Parse top-level ## N. Title headings into child tasks (ignore ### and deeper)
```

**Step 2: Add child collapse after parent completion block**

After the parent completion block (`IF task.parent exists AND all siblings completed: / Set parent.status = "completed"`), insert:

```

  # --- Collapse completed children ---
  IF task.parent exists AND parent.status == "completed":
    Remove all child entries of parent from TodoWrite list
    (Parent stays as "completed" for progress tracking)
```

**Step 3: Verify**

Read the full file and confirm:
1. Depth limit text in lazy expansion block
2. Collapse block between parent completion and `Update TodoWrite`

---

## Expected Result

After these changes, when a skill like `/design` runs:

1. TodoWrite starts with 4 items: `0. Prime`, `1. Execute`, `2. Validate`, `3. Checkpoint`
2. When `0. Prime` becomes `in_progress`, task runner reads `phases/0-prime.md` and creates sub-tasks `0.1`, `0.2`, etc.
3. When all `0.x` tasks complete, `0. Prime` completes, its children collapse from TodoWrite
4. `1. Execute` becomes `in_progress`, lazily expands its sub-tasks
5. Repeat until all phases done

@_shared/task-runner.md
