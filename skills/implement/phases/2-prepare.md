# 2. Prepare (Tasks)

## Overview

Load plan, review critically, create task list, verify readiness for execution.

**Core principle:** Thorough preparation prevents execution failures.

**Announce at start:** "Preparing implementation - loading plan and creating tasks."

## Step 1: Load Persisted Tasks

Check for existing task state from a previous session:

```bash
# Try <plan-path>.tasks.json
TASKS_FILE="${PLAN_PATH%.md}.tasks.json"
if [ -f "$TASKS_FILE" ]; then
    echo "Found existing tasks: $TASKS_FILE"
fi
```

1. Call `TaskList` to check for existing native tasks
2. **CRITICAL - Locate tasks file:** Try `<plan-path>.tasks.json`
3. If tasks file exists AND native tasks empty: recreate from JSON using TodoWrite
4. If native tasks exist: verify they match plan, resume from first `pending`/`in_progress`
5. If neither: proceed to Step 2 to bootstrap from plan

## Step 2: Load and Review Plan

1. Read plan file fully
2. Review critically - identify any questions or concerns:
   - Are all file paths valid?
   - Are dependencies available?
   - Are there missing steps?
3. If concerns: **STOP** - raise them before starting execution
4. If no concerns: Proceed to task setup

## Step 3: Bootstrap Tasks from Plan

If no existing tasks, parse plan and create native task tracking:

### Parse Task Headers

Look for `## Task N:` or `### Task N:` headers in plan document.

### Create Native Tasks

For each task found, use `TodoWrite` with:

```yaml
TodoWrite:
  todos:
    - content: "Task N: [Component Name]"
      activeForm: "Implementing [Component Name]"
      status: pending
```

### Persist Tasks

Write task state to co-located file:

```json
{
  "planPath": ".agents/plan/2026-03-01-feature.md",
  "worktree": ".agents/worktrees/implement/feature",
  "branch": "implement/feature",
  "tasks": [
    {"id": 0, "subject": "Task 0: ...", "status": "pending"},
    {"id": 1, "subject": "Task 1: ...", "status": "pending", "blockedBy": [0]}
  ],
  "lastUpdated": "<timestamp>"
}
```

## Step 4: Verify Readiness

Before proceeding to Execute phase:

### Checklist

- [ ] Plan loaded and reviewed
- [ ] All concerns raised and addressed
- [ ] Native tasks created
- [ ] Task file persisted
- [ ] Working directory is in worktree

### Report Readiness

```
Preparation complete.
Plan: <plan-path>
Worktree: <worktree-path>
Tasks: <N> tasks ready
First task: <Task 0 name>
Ready for Phase 3: Execute
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| .tasks.json exists | Resume from stored state |
| Native tasks exist | Verify match, resume |
| No existing tasks | Bootstrap from plan |
| Plan has concerns | STOP and raise before executing |

## Common Mistakes

### Skipping plan review

- **Problem:** Execute broken plan, waste time
- **Fix:** Always review critically, raise concerns

### Not persisting tasks

- **Problem:** Can't resume if session interrupted
- **Fix:** Write .tasks.json after every state change

### Ignoring dependencies

- **Problem:** Execute tasks out of order
- **Fix:** Parse and track blockedBy relationships

## Red Flags

**Never:**
- Skip plan review
- Start execution with unaddressed concerns
- Proceed without task persistence
- Execute outside worktree

**Always:**
- Review plan critically
- Raise concerns before starting
- Persist task state
- Verify worktree is active

## Exit Criteria

✓ Plan loaded and reviewed
✓ Concerns raised (if any)
✓ Native tasks created via TodoWrite
✓ Task state persisted to .tasks.json
✓ Working in correct worktree

**On success:** Proceed to Phase 3: Execute
**On failure:** Stop and ask for help
