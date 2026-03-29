# Hierarchical Task Runner Implementation Plan

**Goal:** Create a shared task runner that parses markdown headings/lists into tasks, tracks via TodoWrite, and loops until complete with validation reset support.

**Architecture:** Single shared file `skills/_shared/task-runner.md` that gets @imported at the end of phase files. Parses headings (## 1.) and numbered lists (1. Item) into tasks. Validation steps (by keyword) auto-reset to previous sibling on failure.

**Tech Stack:** Markdown, TodoWrite tool, Claude Code skill system

**Design Doc:** [.agents/design/2026-03-04-task-runner.md](.agents/design/2026-03-04-task-runner.md)

---

## Task 0: Create task-runner.md

**Files:**
- Create: `skills/_shared/task-runner.md`

**Step 1: Create the file with parsing instructions**

```markdown
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
```

**Step 2: Verify file created**

Run: `cat skills/_shared/task-runner.md | head -20`
Expected: Shows "# Task Runner" header and parsing section

---

## Task 1: Test with /plan skill

**Files:**
- Modify: `skills/plan/SKILL.md` (add @import at end)

**Step 1: Add @import to plan SKILL.md**

Add at the end of the file:
```markdown
@_shared/task-runner.md
```

**Step 2: Verify import added**

Run: `tail -3 skills/plan/SKILL.md`
Expected: Shows `@_shared/task-runner.md` line

**Step 3: Manual test**

Invoke `/plan` on a design doc and verify:
- TodoWrite shows hierarchical task list
- Tasks execute in order
- Validation failure resets previous phase

---

## Task 2: Roll out to other skills

**Files:**
- Modify: `skills/design/SKILL.md`
- Modify: `skills/bootstrap/SKILL.md`
- Modify: `skills/bootstrap-discovery/SKILL.md`
- Modify: `skills/bootstrap-wizard/SKILL.md`
- Modify: `skills/release/SKILL.md`
- Modify: `skills/status/SKILL.md`
- Modify: `skills/validate/SKILL.md`

**Step 1: Add @import to each skill**

For each skill file, add at the end:
```markdown
@_shared/task-runner.md
```

**Step 2: Verify all skills have import**

Run: `grep -l "task-runner" skills/*/SKILL.md`
Expected: Lists all skill files (design, plan, bootstrap, etc.)

---

## Verification

1. `ls skills/_shared/task-runner.md` — file exists
2. `grep "task-runner" skills/*/SKILL.md | wc -l` — count matches expected skills
3. Manual: Run `/design test-feature` and observe TodoWrite tracking phases
