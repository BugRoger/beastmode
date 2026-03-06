# 3. Execute (Implementation)

## Overview

Execute tasks in parallel batches, respecting dependencies.

**Core principle:** Batch independent tasks for parallel execution, no commits until Complete.

**Announce at start:** "Executing implementation tasks in parallel batches."

## Batch Execution

Execute tasks in batches of up to 3 independent tasks.

### Batch Selection Algorithm

1. Find all tasks with status `pending`
2. Filter to tasks with no unmet `blockedBy` dependencies
3. Take up to 3 tasks for the batch
4. If no tasks eligible but some remain: report blocked state

### Parallel Execution

For each batch, spawn parallel agents:

```yaml
Agent (parallel for each task in batch):
  subagent_type: general-purpose
  prompt: |
    Execute Task N from the plan.

    Plan: <plan-path>
    Task: <task-subject>
    Worktree: <worktree-path>

    Follow the task steps exactly. Do NOT commit.
    Report success or failure when done.
```

### After Batch Completes

1. Collect results from all agents
2. Update task states:
   - Success → `completed`
   - Failure → `blocked`
3. Update `.tasks.json`
4. Report batch summary
5. Continue to next batch

### Batch Report Format

```
Batch complete (tasks 1-3 of 9)

✓ Task 1: [name]
✓ Task 2: [name]
✗ Task 3: [name] - blocked: [reason]

Next batch: Tasks 4-6
```

## Handling Failures

### Task Failure in Batch

If a task fails during batch execution:
1. Mark task as `blocked` with reason
2. Continue with other tasks in batch
3. Report all failures at batch end
4. Eligible tasks continue in next batch

### All Tasks Blocked

```
Execution blocked. No tasks can proceed.

Blocked tasks:
- Task N: [reason]
- Task M: [reason]

Please resolve blockers to continue.
```

STOP. Wait for user guidance.

### Unclear Instruction

```
Task N step unclear.

Step: <step text>
Question: <what's unclear>

Stopping task. Other batch tasks continue.
```

Mark task blocked, continue batch.

## Task State Management

### Native Task Tracking

Use TodoWrite for real-time UI feedback:

```yaml
# Current state
TodoWrite:
  todos:
    - content: "Task 0: Setup"
      activeForm: "Setting up"
      status: completed
    - content: "Task 1: Implementation"
      activeForm: "Implementing"
      status: in_progress
    - content: "Task 2: Testing"
      activeForm: "Testing"
      status: pending
```

### Persistent State

Update `.tasks.json` after EVERY batch:

```json
{
  "planPath": ".agents/plan/2026-03-01-feature.md",
  "worktree": ".agents/worktrees/implement/feature",
  "branch": "implement/feature",
  "tasks": [
    {"id": 0, "subject": "Task 0: Setup", "status": "completed"},
    {"id": 1, "subject": "Task 1: Implementation", "status": "completed"},
    {"id": 2, "subject": "Task 2: Testing", "status": "pending"}
  ],
  "lastUpdated": "2026-03-01T12:34:56Z"
}
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| Batch complete | Update states, report, next batch |
| Task fails | Mark blocked, continue batch |
| All blocked | STOP, ask for help |
| All done | Proceed to Phase 4: Complete |

## Common Mistakes

### Not updating task state after batch

- **Problem:** Progress tracking inaccurate, can't resume
- **Fix:** Update all task states immediately after batch

### Committing during execution

- **Problem:** Multiple commits instead of single feature commit
- **Fix:** No commits until Complete phase

### Sequential execution of independent tasks

- **Problem:** Slow execution, wasted parallelism
- **Fix:** Batch independent tasks for parallel execution

## Red Flags

**Never:**
- Commit during Execute phase
- Execute dependent tasks in parallel
- Continue when all tasks blocked
- Work outside the worktree

**Always:**
- Batch independent tasks
- Update state after each batch
- Stop when blocked
- Defer commits to Complete phase

## Exit Criteria

✓ All tasks marked complete (or blocked with reason)
✓ No commits made (deferred to Complete)
✓ Task state persisted
✓ Ready for single commit

**On success:** Proceed to Phase 4: Complete
**On failure:** Stop and ask for help
