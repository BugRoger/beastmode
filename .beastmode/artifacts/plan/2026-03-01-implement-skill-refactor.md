# Implement Skill Refactor - Implementation Plan

**Goal:** Simplify /implement by removing tests/deps/per-task-commits, adding parallel batch execution.

**Architecture:** Surgical edits to 4 phase files. Remove test/dep sections, replace sequential execution with parallel batching, move single commit to Complete phase.

**Tech Stack:** Markdown skill files

**Design Doc:** [.agents/design/2026-03-01-implement-skill-refactor.md](.agents/design/2026-03-01-implement-skill-refactor.md)

---

## Task 0: Simplify Setup Phase

**Files:**
- Modify: `skills/implement/phases/setup.md`

**Step 1: Remove dependency auto-detection section**

Delete lines 86-102 (the "Run Project Setup" section with npm/cargo/pip/go detection).

**Step 2: Remove test baseline verification section**

Delete lines 104-118 (the "Verify Clean Baseline" section).

**Step 3: Update report template**

Replace lines 122-127:

```markdown
### 6. Report Location

```
Worktree ready at <full-path>
Branch: <branch-name>
Ready for Phase 2: Prepare
```
```

Remove the "Tests passing" line.

**Step 4: Update Quick Reference table**

Remove these rows:
- `| Tests fail during baseline | Report failures + ask |`
- `| No package.json/Cargo.toml | Skip dependency install |`

**Step 5: Update Common Mistakes section**

Delete the "Proceeding with failing tests" subsection (lines 145-148).

Delete the "Hardcoding setup commands" subsection (lines 150-153).

**Step 6: Update Red Flags section**

From "Never:" remove:
- `- Skip baseline test verification`
- `- Proceed with failing tests without asking`

From "Always:" remove:
- `- Auto-detect and run project setup`
- `- Verify clean test baseline`

**Step 7: Update Exit Criteria**

Replace exit criteria with:

```markdown
## Exit Criteria

✓ Worktree created at `.agents/worktrees/<branch-name>/`
✓ Branch created: `implement/<feature-name>`
✓ Directory verified as gitignored

**On success:** Proceed to Phase 2: Prepare
**On failure:** Stop and ask for help
```

---

## Task 1: Simplify Prepare Phase

**Files:**
- Modify: `skills/implement/phases/prepare.md`

**Step 1: Update readiness checklist**

In Step 4 checklist (around line 83), remove:
- `- [ ] Tests still pass`

**Step 2: Update Exit Criteria**

Remove from exit criteria:
- `✓ Tests pass`

---

## Task 2: Rewrite Execute Phase for Parallel Batching

**Files:**
- Modify: `skills/implement/phases/execute.md`

**Step 1: Update Overview section**

Replace lines 1-9 with:

```markdown
# Phase 3: Execute (Implementation)

## Overview

Execute tasks in parallel batches, respecting dependencies.

**Core principle:** Batch independent tasks for parallel execution, no commits until Complete.

**Announce at start:** "Executing implementation tasks in parallel batches."
```

**Step 2: Replace Execution Loop with Batch Execution**

Replace the entire "Execution Loop" section (lines 11-72) with:

```markdown
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
```

**Step 3: Update Handling Failures section**

Replace the entire "Handling Failures" section with:

```markdown
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
```

**Step 4: Remove commit references**

Delete Step 4 "Commit (if plan specifies)" section entirely (lines 49-56).

**Step 5: Update Task State Management**

Keep the section but remove any commit references.

**Step 6: Update Quick Reference table**

Replace with:

```markdown
## Quick Reference

| Situation | Action |
|-----------|--------|
| Batch complete | Update states, report, next batch |
| Task fails | Mark blocked, continue batch |
| All blocked | STOP, ask for help |
| All done | Proceed to Phase 4: Complete |
```

**Step 7: Update Common Mistakes**

Replace with:

```markdown
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
```

**Step 8: Update Red Flags**

Replace with:

```markdown
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
```

**Step 9: Update Exit Criteria**

Replace with:

```markdown
## Exit Criteria

✓ All tasks marked complete (or blocked with reason)
✓ No commits made (deferred to Complete)
✓ Task state persisted
✓ Ready for single commit

**On success:** Proceed to Phase 4: Complete
**On failure:** Stop and ask for help
```

---

## Task 3: Update Complete Phase for Single Commit

**Files:**
- Modify: `skills/implement/phases/complete.md`

**Step 1: Replace Step 1 (Verify Tests) with Commit Step**

Replace lines 11-29 with:

```markdown
## Step 1: Create Single Commit

Stage and commit all changes made during Execute phase:

```bash
# Stage all changes
git add -A

# Create feature commit
git commit -m "$(cat <<'EOF'
feat: <feature-name-from-plan>

Implements plan: .agents/plan/YYYY-MM-DD-<topic>.md
EOF
)"
```

**Feature name:** Extract from plan filename (e.g., `2026-03-01-auth-refactor.md` → `auth-refactor`)

**If nothing to commit:** Report "No changes to commit" and proceed to merge options.
```

**Step 2: Remove test verification from Option 1**

In Option 1 (Merge Locally), remove:
```bash
# Verify tests on merged result
<test command>
```

**Step 3: Update Common Mistakes**

Replace "Skipping test verification" with:

```markdown
### Forgetting to commit before merge

- **Problem:** Changes lost on worktree removal
- **Fix:** Always commit in Step 1 before presenting options
```

**Step 4: Update Red Flags**

From "Never:" remove:
- `- Merge with failing tests`

From "Always:" remove:
- `- Verify tests before merge`

Add to "Always:":
- `- Commit all changes before merge options`

**Step 5: Update Exit Criteria for Option 1**

Replace:
```
✓ Tests pass on merged result
```

With:
```
✓ Single commit created
```

---

## Summary

| Task | File | Changes |
|------|------|---------|
| 0 | setup.md | Remove deps/tests sections |
| 1 | prepare.md | Remove test checklist item |
| 2 | execute.md | Parallel batching, no commits |
| 3 | complete.md | Add commit step, remove test verification |
