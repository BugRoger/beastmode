---
name: implement
description: "Execute implementation plans in isolated git worktrees. Creates .agent/worktrees/ workspace, runs tasks from .agent/plan/*.md, merges back to main on completion. Use when you have a plan ready to implement or when executing multi-task development work."
---

@../references/session-tracking.md

# /implement

## CRITICAL CONSTRAINTS — Read Before Anything Else

**NEVER call `EnterPlanMode` or `ExitPlanMode` during this skill.** This skill operates in normal mode. Calling either traps or breaks the workflow.

## Overview

Create isolated worktree, load plan, execute tasks, merge back, cleanup.

**Core principle:** Isolated worktree execution with clean merge on completion.

**Announce:** "I'm using the /implement skill to execute this plan."

## Arguments

```
/implement <plan-path>
```

Example: `/implement .agent/plan/2026-03-01-feature.md`

If no path provided, list available plans in `.agent/plan/` and ask user to select.

## The Four Phases

This skill operates in four sequential phases. Each phase must complete successfully before proceeding to the next.

### Phase 1: Setup (Worktree)

@phases/setup.md

Creates isolated git worktree for implementation work.

**Entry criteria:** Valid plan path provided
**Exit criteria:** Worktree created, dependencies installed, tests pass

### Phase 2: Prepare (Tasks)

@phases/prepare.md

Load plan, create task list, verify readiness.

**Entry criteria:** Clean worktree with passing tests
**Exit criteria:** Tasks created and ready for execution

### Phase 3: Execute (Implementation)

@phases/execute.md

Execute tasks in sequence, verify each step.

**Entry criteria:** Task list ready
**Exit criteria:** All tasks complete, tests pass

### Phase 4: Complete (Merge & Cleanup)

@phases/complete.md

Merge back to main, cleanup worktree, handoff to verify.

**Entry criteria:** All tasks complete, tests pass
**Exit criteria:** Merged to main, worktree removed, ready for /verify

## Quick Reference

| Phase | Purpose | Key Actions |
|-------|---------|-------------|
| Setup | Isolation | Create worktree, install deps, verify tests |
| Prepare | Planning | Load plan, create tasks, review |
| Execute | Work | Run tasks, verify steps, commit |
| Complete | Integration | Merge, cleanup, handoff |

## When to Stop and Ask for Help

**STOP executing immediately when:**

- Worktree creation fails
- Tests fail during setup
- Plan has critical gaps
- Task execution hits blocker
- Merge conflicts occur

**Ask for clarification rather than guessing.**

## Remember

- Never work directly on main/master branch
- All work happens in isolated worktree
- Tests must pass at each phase boundary
- Commits happen in Execute phase
- Merge happens in Complete phase
- Reference skills when plan says to
- Stop when blocked, don't guess

## Integration

**Required workflow skills:**
- **beastmode:plan** - Creates the plan this skill executes
- **beastmode:verify** - Complete development after merge

---

## Workflow

Part of: bootstrap → prime → research → design → plan → **implement** → status → verify → release → retro

## Session Status Tracking

**On completion (Phase 4: Complete, after merge):**

1. Extract feature name from plan doc filename
2. Extract date from plan doc filename
3. Get session path using `get_session_path()` with a unique part of your initial arguments
4. Update `.agent/status/YYYY-MM-DD-<feature>.md`
5. Add entry to "Executed Phases" list
6. Append Implement phase section with:
   - Summary: tasks completed, merge status
   - Decisions: any implementation choices made
   - Issues: blockers encountered, how resolved

## Context Report

@../_shared/CONTEXT-REPORT.md
