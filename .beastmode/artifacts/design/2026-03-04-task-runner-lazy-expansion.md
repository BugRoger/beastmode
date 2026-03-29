# Design: Task Runner Lazy Expansion

## Goal

Task-runner should show sub-step progress in TodoWrite when executing phase files, not just the 4 top-level phases.

## Problem

The task-runner parses SKILL.md into 4 flat tasks (0. Prime, 1. Execute, 2. Validate, 3. Checkpoint). When it enters a phase file like `0-prime.md`, it executes the sub-steps silently without any TodoWrite tracking. Users see no progress within a phase.

## Approach: Lazy Expansion

When the execute loop starts a task that links to a file (`[Link](path)` syntax):

1. Read the linked file
2. Parse `## N. Title` headings into child tasks
3. Insert them into TodoWrite as children (ids: `{parent.id}.{N}`)
4. Parent stays `in_progress` while children execute
5. Parent auto-completes when all children complete

### Why Lazy Over Eager

- Keeps initial list clean (4 items, not 20+)
- Sub-steps might vary by context (e.g., research trigger may add/skip steps)
- Matches how humans think — "what am I doing now" not "everything I'll ever do"

## Changes

**Single file:** `skills/_shared/task-runner.md`

### 1. Loop entry condition

Change from:
```
task = first task where status == "pending" AND parent is completed (or no parent)
```

To:
```
task = first task where status == "pending" AND (parent is completed OR parent is in_progress OR no parent)
```

Children can run when their parent is `in_progress`.

### 2. Lazy expansion block (new)

After `Set task.status = "in_progress"`, before `Execute the task content`:

```
IF task has a linked file (from [Link](path) syntax) AND task has no children yet:
  Read the linked file
  Parse ## N. Title headings into child tasks
  Insert children into todo list after parent (ids: "{parent.id}.{N}")
  Set first child to "in_progress"
  Update TodoWrite
  CONTINUE LOOP (children execute first, parent completes when all done)
```

### 3. Parent completion block (new)

After task success/fail handling:

```
IF task.parent exists AND all siblings completed:
  Set parent.status = "completed"
```

## Runtime Example

```
[in_progress] 0. Prime
[pending]     1. Execute
[pending]     2. Validate
[pending]     3. Checkpoint

— enters phase 0, reads 0-prime.md —

[in_progress] 0. Prime
[in_progress]   0.1 Announce Skill
[pending]       0.2 Load Project Context
[pending]       0.3 Check Research Trigger
[pending]       0.4 Create Cycle Worktree
[pending]       0.5 Explore Context
[pending]       0.6 Ask Clarifying Questions
[pending]     1. Execute
[pending]     2. Validate
[pending]     3. Checkpoint
```

## Testing

Run any skill (e.g., `/design`) and verify:
- Sub-steps appear in TodoWrite when entering a phase
- Sub-steps complete individually
- Parent completes when all children done
- Next phase starts after parent completes
