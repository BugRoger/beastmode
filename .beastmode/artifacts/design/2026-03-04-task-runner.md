# Hierarchical Task Runner

## Goal

Prevent skills from skipping phases and substeps by enforcing task completion via TodoWrite.

## Problem

- /implement works because it uses TodoWrite
- Other skills (/design, /plan, etc.) skip numbered phases/substeps
- No enforcement mechanism for step completion

## Solution

A shared task runner that:
1. Parses markdown headings into hierarchical tasks
2. Tracks progress via TodoWrite
3. Supports reset-on-failure for validation steps
4. Loops until all tasks complete

## Architecture

### Heading → Task Mapping

```markdown
# Phase
## 1. Section
### 1.1 Substep A
### 1.2 Substep B
## 2. Validate
### 2.1 Check completeness
### 2.2 Get approval
```

### List → Task Mapping

```markdown
## Phases

1. [Prime](phases/0-prime.md) — Load context
2. [Execute](phases/1-execute.md) — Create tasks
3. [Validate](phases/2-validate.md) — Check completeness
4. [Checkpoint](phases/3-checkpoint.md) — Save plan
```

### Both Become Tasks

```
□ 1. Section
  □ 1.1 Substep A
  □ 1.2 Substep B
□ 2. Validate → auto-resets to 1 on fail
  □ 2.1 Check completeness
  □ 2.2 Get approval
```

Or from list:

```
□ 1. Prime — Load context
□ 2. Execute — Create tasks
□ 3. Validate — Check completeness → auto-resets to 2 on fail
□ 4. Checkpoint — Save plan
```

### Reset Convention

No markup needed. Steps with these keywords auto-reset to previous sibling:
- **Validate**
- **Approval**
- **Check**
- **Verify**

If "2. Validate" fails → reset "1. Section" to pending → re-execute.

### Execution Loop

```
1. Parse headings AND numbered lists from current file
2. Build task tree from nesting (headings) or flat list (numbered items)
3. Detect validation steps by keyword (Validate, Approval, Check, Verify)
4. Create TodoWrite entries (flattened, with hierarchy in labels)

LOOP:
  task = next pending task (depth-first, blockers met)

  IF none:
    IF all completed → EXIT
    ELSE → STOP (blocked or deadlock)

  task.status = in_progress
  Execute task

  IF success:
    task.status = completed
  IF fail:
    IF task is validation step (by keyword):
      previous_sibling.status = pending
      task.status = pending
    ELSE:
      task.retries++
      IF retries >= 2: task.status = blocked
      ELSE: task.status = pending

  Update TodoWrite

GOTO LOOP
```

### TodoWrite Integration

Flattened view with hierarchy in labels:

```yaml
TodoWrite:
  todos:
    - content: "1. Section"
      activeForm: "Working on Section"
      status: completed
    - content: "1.1 Substep A"
      activeForm: "Doing Substep A"
      status: completed
    - content: "1.2 Substep B"
      activeForm: "Doing Substep B"
      status: in_progress
```

## Example: /plan

### Task List

```
□ 0. Prime
  □ 0.1 Announce Skill
  □ 0.2 Load Project Context
  □ 0.3 Check Research Trigger
  □ 0.4 Read Design Document
  □ 0.5 Enter Cycle Worktree
  □ 0.6 Explore Codebase

□ 1. Execute
  □ 1.1 Create Plan Header
  □ 1.2 Write Tasks
  □ 1.3 Task Guidelines

□ 2. Validate
  □ 2.1 Completeness Check
  □ 2.2 User Approval Gate

□ 3. Checkpoint
  □ 3.1 Save Plan
  □ 3.2 Create Task Persistence File
  □ 3.3 Suggest Next Step
  □ 3.4 Session Tracking
  □ 3.5 Context Report
```

### Flow Example

```
0.1 ✓ → 0.2 ✓ → 0.3 ✓ → 0.4 ✓ → 0.5 ✓ → 0.6 ✓
→ 1.1 ✓ → 1.2 ✓ → 1.3 ✓
→ 2.1 FAIL (missing verification steps)
→ resets to 1
→ 1.1 ✓ → 1.2 ✓ → 1.3 ✓
→ 2.1 ✓ → 2.2 FAIL (user says "revise task 3")
→ resets to 1
→ 1.1 ✓ → 1.2 ✓ → 1.3 ✓
→ 2.1 ✓ → 2.2 ✓
→ 3.1 ✓ → 3.2 ✓ → 3.3 ✓ → 3.4 ✓ → 3.5 ✓
→ DONE
```

### TodoWrite Output

```yaml
TodoWrite:
  todos:
    - content: "0. Prime"
      activeForm: "Priming"
      status: completed
    - content: "0.1 Announce Skill"
      activeForm: "Announcing skill"
      status: completed
    - content: "0.2 Load Project Context"
      activeForm: "Loading context"
      status: completed
    - content: "0.3 Check Research Trigger"
      activeForm: "Checking research trigger"
      status: completed
    - content: "0.4 Read Design Document"
      activeForm: "Reading design"
      status: completed
    - content: "0.5 Enter Cycle Worktree"
      activeForm: "Entering worktree"
      status: completed
    - content: "0.6 Explore Codebase"
      activeForm: "Exploring codebase"
      status: completed
    - content: "1. Execute"
      activeForm: "Executing"
      status: in_progress
    - content: "1.1 Create Plan Header"
      activeForm: "Creating header"
      status: completed
    - content: "1.2 Write Tasks"
      activeForm: "Writing tasks"
      status: in_progress
    - content: "1.3 Task Guidelines"
      activeForm: "Applying guidelines"
      status: pending
    - content: "2. Validate"
      activeForm: "Validating"
      status: pending
    - content: "2.1 Completeness Check"
      activeForm: "Checking completeness"
      status: pending
    - content: "2.2 User Approval Gate"
      activeForm: "Getting approval"
      status: pending
    - content: "3. Checkpoint"
      activeForm: "Checkpointing"
      status: pending
    - content: "3.1 Save Plan"
      activeForm: "Saving plan"
      status: pending
    - content: "3.2 Create Task Persistence File"
      activeForm: "Creating task file"
      status: pending
    - content: "3.3 Suggest Next Step"
      activeForm: "Suggesting next step"
      status: pending
    - content: "3.4 Session Tracking"
      activeForm: "Tracking session"
      status: pending
    - content: "3.5 Context Report"
      activeForm: "Generating report"
      status: pending
```

## Components

| File | Purpose |
|------|---------|
| `skills/_shared/task-runner.md` | Shared utility, @imported by phases |

## Constraints

- Max 2 retries per task before blocking
- Reset only goes back, never forward
- Parent completes only when all children complete
- TodoWrite always reflects current state

## Decisions

| Decision | Rationale |
|----------|-----------|
| Headings as tasks | Natural fit for markdown phase files |
| Lists as tasks | SKILL.md uses numbered lists for phases |
| Keyword-based reset | Zero markup, naming convention drives behavior |
| Flattened TodoWrite | Tool doesn't support nesting, labels preserve hierarchy |
| Depth-first execution | Matches reading order, intuitive |
| Single shared file | DRY, consistent behavior across skills |
