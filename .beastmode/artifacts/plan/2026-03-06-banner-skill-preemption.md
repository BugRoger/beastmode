# Banner Skill Preemption Fix — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Fix the session banner not printing when user's first message is a skill invocation.

**Architecture:** Add Step 0 to `_shared/task-runner.md` that checks system context for SessionStart banner output before parsing tasks. Remove redundant Prime Directive from `BEASTMODE.md`.

**Tech Stack:** Markdown (Claude Code plugin skill definitions)

**Design Doc:** `.beastmode/state/design/2026-03-06-banner-skill-preemption.md`

---

### Task 0: Add Session Banner Check to task-runner.md

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/_shared/task-runner.md:1-4`

**Step 1: Add Step 0 before existing Step 1**

Insert new section between the file description (line 2) and the current `## 1. Parse Tasks` (line 5). Renumber existing steps 1→2, 2→3, 3→4, 4→5.

New content for `skills/_shared/task-runner.md`:

````markdown
# Task Runner

Parse current file into tasks and execute with TodoWrite tracking.

## 1. Session Banner Check

Before parsing tasks, check if the conversation's system context contains a `SessionStart:` hook message with banner output (look for block characters like `█`).

**If found AND no banner has been displayed earlier in this conversation:**
1. Extract the banner text and tagline from the hook output
2. Strip ANSI escape codes (sequences matching `\033[...m` or `\x1b[...m`)
3. Display the cleaned banner in a code block
4. Follow with a one-sentence persona greeting (context-aware per persona.md)

**If not found OR banner was already displayed:** skip to Step 2.

## 2. Parse Tasks

Scan the current file for:
- **Headings**: `## N. Title` or `### N.M Title` → hierarchical tasks
- **Numbered lists**: `1. [Link](path) — Description` → flat tasks

Build task list with:
- `id`: The number (e.g., "1", "1.1", "2")
- `content`: The title/description
- `activeForm`: Present participle form (e.g., "Creating header")
- `isValidation`: true if title contains "Validate", "Approval", "Check", or "Verify"
- `parent`: Parent task id for nested tasks (null for top-level)

**Linked items are opaque**: For items with `[Link](path)` syntax, create a single task entry. **Do NOT read or parse the linked file yet.** Store the path on the task for lazy expansion during execution.

## 3. Initialize TodoWrite

Create TodoWrite entries for top-level tasks only (linked sub-phases are not yet expanded):
- First task: `status: in_progress`
- All others: `status: pending`

Flattened with hierarchy preserved in labels:
- "1. Section"
- "1.1 Substep A"
- "1.2 Substep B"

## 4. Execute Loop

```
LOOP:
  task = first task where status == "pending" AND (parent is completed OR parent is in_progress OR no parent)

  IF no task found:
    IF all completed → EXIT phase
    IF any blocked → STOP and report
    ELSE → deadlock, STOP and report

  Set task.status = "in_progress"
  Update TodoWrite

  # --- Lazy expansion ---
  IF task has a linked file (from [Link](path) syntax) AND task has no children yet:
    Read the linked file
    Parse top-level ## N. Title headings into child tasks (ignore ### and deeper)
    Insert children into todo list after parent (ids: "{parent.id}.{N}")
    Set first child to "in_progress"
    Update TodoWrite
    CONTINUE LOOP (children execute first, parent completes when all done)

  # --- Gate detection ---
  IF task.content matches pattern "[GATE|<gate-id>]":
    Read `.beastmode/config.yaml`
    Look up gate-id:
      - If gate-id starts with "transitions." → check under `transitions:` key
      - Otherwise → check under `gates:` key (e.g., "design.design-approval" → gates.design.design-approval)
    Resolve mode: config value, or "human" if config missing or key not found
    Find child tasks — each has a [GATE-OPTION|mode] label
    Remove all children whose [GATE-OPTION|mode] does NOT match the resolved mode
    Set the surviving child to "in_progress"
    Update TodoWrite
    CONTINUE LOOP (surviving child executes, parent completes when child done)

  Execute the task content

  IF success:
    task.status = "completed"
    IF task has children: set first child to "in_progress"

  IF fail:
    IF task.isValidation:
      Find previous sibling task
      Reset previous sibling (and its children) to "pending"
      task.status = "pending"
    ELSE:
      task.retries = (task.retries || 0) + 1
      IF task.retries >= 2:
        task.status = "blocked"
      ELSE:
        task.status = "pending"

  # --- Parent completion ---
  IF task.parent exists AND all siblings completed:
    Set parent.status = "completed"

  # --- Collapse completed children ---
  IF task.parent exists AND parent.status == "completed":
    Remove all child entries of parent from TodoWrite list
    (Parent stays as "completed" for progress tracking)

  Update TodoWrite

GOTO LOOP
```

## 5. Completion

When all tasks completed:
- Report: "Phase complete. All N tasks done."
- Exit to next phase or skill completion
````

**Step 2: Verify the diff**

The changes are:
1. New `## 1. Session Banner Check` section inserted after line 2
2. `## 1. Parse Tasks` → `## 2. Parse Tasks`
3. `## 2. Initialize TodoWrite` → `## 3. Initialize TodoWrite`
4. `## 3. Execute Loop` → `## 4. Execute Loop`
5. `## 4. Completion` → `## 5. Completion`

No other content changes.

---

### Task 1: Remove Prime Directive from BEASTMODE.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/BEASTMODE.md:5-8`

**Step 1: Remove the banner display directive**

Change the Prime Directives section from:

```markdown
## Prime Directives

- Adopt the persona below for ALL interactions
- When you see SessionStart hook output in your system context, display the banner output verbatim in a code block, then greet in persona voice with context-awareness (time of day, project state)
```

To:

```markdown
## Prime Directives

- Adopt the persona below for ALL interactions
```

**Step 2: Verify**

Confirm `BEASTMODE.md` has only one Prime Directive remaining. The banner display is now owned by task-runner.md Step 1.
