# Task Runner

Parse current file into tasks and execute with TodoWrite tracking.

## 1. Parse Tasks

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

## 2. Initialize TodoWrite

Create TodoWrite entries for top-level tasks only (linked sub-phases are not yet expanded):
- First task: `status: in_progress`
- All others: `status: pending`

Flattened with hierarchy preserved in labels:
- "1. Section"
- "1.1 Substep A"
- "1.2 Substep B"

## 3. Execute Loop

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
  IF task.content matches pattern "Gate: <gate-id>":
    Read `.beastmode/config.yaml`
    Look up gate-id:
      - If gate-id starts with "transitions." → check under `transitions:` key
      - Otherwise → check under `gates:` key (e.g., "design.design-approval" → gates.design.design-approval)
    Resolve mode: config value, or "human" if config missing or key not found
    Find child tasks (N.1, N.2, etc.) — each starts with a mode label (e.g., "human — ...", "auto — ...")
    Remove all children whose mode label does NOT match the resolved mode
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

## 4. Completion

When all tasks completed:
- Report: "Phase complete. All N tasks done."
- Exit to next phase or skill completion
