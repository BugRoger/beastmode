# 2. Write Plan

## 1. Create Plan Header

Every plan MUST start with:

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Design Doc:** [Link to .agents/design/ doc if applicable]

---
```

## 2. Write Tasks

For each component in the design, create a task following the format in [references/task-format.md](../references/task-format.md).

Update `TodoWrite` as you write each task.

## 3. Save Plan

Save to `.agents/plan/YYYY-MM-DD-<feature-name>.md`

## 4. Create Task Persistence File

Save to `.agents/plan/YYYY-MM-DD-<feature-name>.tasks.json`:

```json
{
  "planPath": ".agents/plan/YYYY-MM-DD-feature.md",
  "tasks": [
    {"id": 0, "subject": "Task 0: ...", "status": "pending"},
    {"id": 1, "subject": "Task 1: ...", "status": "pending", "blockedBy": [0]}
  ],
  "lastUpdated": "<timestamp>"
}
```
