# Task-Runner Adherence

## Goal

Make task-runner execution verifiable so skipping it is structurally obvious, not silently tolerated.

## Approach

Tighten the HARD-GATE contract in all 5 skill files to specify the observable output (TodoWrite as first tool call), replacing the weak "Read and execute" wording. The task-runner framework is the correct enforcement mechanism (per instruction-visibility Obs 3, 6) — the problem is that its entry point uses a weak verb ("Read") that allows the agent to mentally inline and simplify away the execution loop.

## Root Cause Analysis

In a prior session, the agent:
1. Skipped the task-runner entirely — no TodoWrite tracking, no lazy expansion
2. Freestyled the design conversation using its own priors
3. Created a worktree at `.claude/worktrees/` (Claude Code default) instead of `.beastmode/worktrees/` (beastmode convention)
4. Never reached the checkpoint phase (no retro, no context report)

The worktree path was the visible symptom. The root cause: the HARD-GATE says "Read @_shared/task-runner.md. Parse and execute the phases below." — "Read" is a weak verb that allows comprehension without execution. The agent understood the task-runner's intent and proceeded to freestyle instead of executing the algorithm.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | All 5 skills (design, plan, implement, validate, release) | Same HARD-GATE wording, same failure mode |
| Mechanism | Rewrite HARD-GATE to require TodoWrite as first tool call | Observable output that proves the task-runner ran |
| Worktree path | NOT duplicated in HARD-GATE | Stays in worktree-manager.md; if task-runner runs properly it surfaces via lazy expansion |

### Claude's Discretion

- Exact HARD-GATE wording (preserving each skill's additional constraint line)
- Whether to add a brief comment in task-runner.md referencing this design's rationale

## Component Breakdown

### All 5 SKILL.md files

**Before (all skills):**
```
<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.
[per-skill constraint line]
</HARD-GATE>
```

**After (all skills):**
```
<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

[per-skill constraint line]
</HARD-GATE>
```

Key changes:
1. "Execute" replaces "Read" — action verb, not comprehension verb
2. "Your FIRST tool call MUST be TodoWrite" — specifies the observable proof of execution
3. "Do not output anything else first" — blocks the freestyle-before-framework pattern
4. "Do not skip this for 'simple' tasks" — preempts the "this is too lightweight for the framework" rationalization

## Files Affected

- `skills/design/SKILL.md`
- `skills/plan/SKILL.md`
- `skills/implement/SKILL.md`
- `skills/validate/SKILL.md`
- `skills/release/SKILL.md`

## Acceptance Criteria

- [ ] All 5 SKILL.md files have tightened HARD-GATE wording
- [ ] HARD-GATE specifies TodoWrite as first required tool call
- [ ] HARD-GATE explicitly prohibits output before task-runner execution
- [ ] Each skill's per-skill constraint line is preserved
- [ ] No changes to worktree-manager.md, task-runner.md, or phase files

## Testing Strategy

- Run each skill and verify the first tool call is TodoWrite with parsed phases
- Deliberately invoke a skill with a "simple" topic and verify it still runs the full framework

## Deferred Ideas

- None
