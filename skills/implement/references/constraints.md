# Implement Constraints

## No Plan Mode

**NEVER call `EnterPlanMode` or `ExitPlanMode` during this skill.** This skill operates in normal mode. Calling either traps or breaks the workflow.

## Worktree Isolation

- Never work directly on main/master branch
- All work happens in isolated worktree at `.beastmode/worktrees/`
- Tests must pass at each phase boundary
- Merge happens only in Complete phase
