# Implement Constraints

## No Plan Mode

**NEVER call `EnterPlanMode` or `ExitPlanMode` during this skill.** This skill operates in normal mode. Calling either traps or breaks the workflow.

## Worktree Isolation

- Never work directly on main/master branch
- All work happens in isolated worktree (managed by external Justfile orchestrator)
- Each phase commits to the feature branch at checkpoint
- Merge happens only at /release

## Subagent Safety

- Spawn ONE agent per task (never parallel implementer agents on the same wave — file conflicts)
- Controller stays in the worktree — agents inherit the working directory
- Agents must NOT commit, push, or switch branches
- Agents must NOT read the plan file — controller provides task text
- Agents must NOT modify files outside their task's file list
- If an agent returns ARCHITECTURAL_STOP, controller must present to user before continuing

## Deviation Handling

- Auto-fix and Blocking deviations: agents handle autonomously
- Architectural deviations: agents STOP, controller escalates to user
- All deviations tracked in deviation log for checkpoint
- See [deviation-rules.md](deviation-rules.md) for full taxonomy
