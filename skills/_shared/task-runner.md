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

## 2. Initialize TodoWrite

Create TodoWrite entries for all tasks:
- First task: `status: in_progress`
- All others: `status: pending`

Flattened with hierarchy preserved in labels:
- "1. Section"
- "1.1 Substep A"
- "1.2 Substep B"

## 3. Execute Loop

```
LOOP:
  task = first task where status == "pending" AND parent is completed (or no parent)

  IF no task found:
    IF all completed → EXIT phase
    IF any blocked → STOP and report
    ELSE → deadlock, STOP and report

  Set task.status = "in_progress"
  Update TodoWrite

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

  Update TodoWrite

GOTO LOOP
```

## 4. Completion

When all tasks completed:
- Report: "Phase complete. All N tasks done."
- Exit to next phase or skill completion
