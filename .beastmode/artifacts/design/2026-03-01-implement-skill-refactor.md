# Implement Skill Refactor

## Summary

Simplify the `/implement` skill by removing tests, dependencies, and per-task commits. Add parallel batch execution. Defer single commit to Complete phase.

## Goals

- Remove test verification at all phases
- Remove dependency auto-detection and installation
- Remove per-task commits during Execute
- Add parallel batch execution (3 tasks at a time)
- Single commit per feature in Complete phase

## Approach

Surgical removal from existing 4-phase structure. Keep proven worktree isolation and task persistence logic.

## Phase Changes

### Phase 1: Setup (Simplified)

**Keep:**
- Directory selection (`.agents/worktrees/`)
- Safety verification (`git check-ignore`)
- Branch creation from plan name
- Worktree creation

**Remove:**
- Auto-detect dependencies (npm/cargo/pip/go)
- Dependency installation
- Test baseline verification

**Exit criteria:**
- Worktree created at `.agents/worktrees/<branch-name>/`
- Branch created: `implement/<feature-name>`
- Directory verified as gitignored

### Phase 2: Prepare (Minimal Changes)

**Keep:**
- Load persisted tasks from `.tasks.json`
- Load and review plan critically
- Bootstrap tasks from plan headers (`## Task N:`)
- Create native tasks via `TodoWrite`
- Persist task state to `.tasks.json`

**Remove:**
- "Tests pass" from readiness checklist

**Exit criteria:**
- Plan loaded and reviewed
- Concerns raised (if any)
- Native tasks created via TodoWrite
- Task state persisted to `.tasks.json`
- Working in correct worktree

### Phase 3: Execute (Major Changes)

**Keep:**
- Mark tasks `in_progress` before starting
- Execute tasks per plan instructions
- Mark tasks `completed` after finishing
- Update `.tasks.json` after each batch

**Remove:**
- Run tests after each task
- Commit at plan-specified checkpoints
- Human review checkpoints

**Add - Parallel Batch Execution:**

```
Batch = up to 3 tasks with no dependencies between them
Execute batch tasks in parallel (Agent tool) → Mark complete → Next batch
```

**Batch logic:**
1. Find up to 3 tasks that are `pending` and have no `blockedBy` dependencies
2. Spawn parallel agents to execute them simultaneously
3. Wait for all to complete
4. Update task states
5. Repeat until all tasks done

**Dependency handling:** Tasks with `blockedBy` wait until dependencies complete before becoming eligible for a batch.

**Blocker handling:** If a task fails, mark it `blocked`, continue with other tasks in batch, report at end.

**No commits during Execute** - all changes stay uncommitted until Complete phase.

### Phase 4: Complete (Simplified)

**Keep:**
- Merge workflow with 4 options (merge local, PR, keep worktree, discard)
- Confirmation before destructive actions
- Clean up worktree on merge/discard

**Add:**
- Single commit happens here, before merge options

**Remove:**
- Final test verification before merge
- Test pass requirement for merge

**Flow:**
1. Stage all changes in worktree
2. Create single commit with feature summary
3. Present merge options via AskUserQuestion
4. Execute chosen option
5. Clean up (if merge/discard)

**Commit message format:**
```
feat: <feature-name-from-plan>

Implements plan: .agents/plan/YYYY-MM-DD-<topic>.md
```

**Exit criteria:**
- All changes committed (single commit)
- Merge option selected and executed
- Worktree cleaned up (if applicable)
- `.tasks.json` archived or removed

## Files to Modify

1. `skills/implement/phases/setup.md` - Remove deps/tests sections
2. `skills/implement/phases/prepare.md` - Remove test checklist item
3. `skills/implement/phases/execute.md` - Replace continuous with parallel batching, remove commits
4. `skills/implement/phases/complete.md` - Add commit step, remove test verification

## Not Changing

- `skills/implement/SKILL.md` - Main entry point stays the same
- Worktree isolation approach
- Task persistence (`.tasks.json`)
- 4-phase structure
