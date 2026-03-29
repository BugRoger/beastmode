# Implement v2 — Subagent Execution with Wave Parallelism

## Goal

Redesign /implement to use fresh subagents per task, respect plan wave ordering, handle deviations gracefully, and verify work between tasks — while keeping beastmode's clean, approachable character.

## Approach Summary

Replace main-context sequential execution with a wave-based subagent dispatch model. The controller (main context) stays lean — it reads the plan, groups tasks by wave, spawns subagents, collects results, and runs verification. Three-tier deviation rules replace the current "stop and report" pattern.

## Key Decisions

### Locked Decisions

1. **Wave-based subagent model (Model C)** — Spawn 1 agent per task, grouped by wave. Wave N must complete before Wave N+1 starts. Independent tasks within a wave can run in parallel. Chosen over per-task-only (Superpowers) and pattern-routing (GSD) because it leverages the wave system /plan already produces.

2. **Three-tier deviation rules** — Auto-fix (bugs/types/imports), Blocking (deps/env/config), Architectural (STOP and ask user). Simplified from GSD's four tiers. "Missing Critical" merged into Auto-fix since the distinction between "bug" and "missing validation" rarely matters in practice.

3. **Lightweight spec check per task** — After each subagent completes: verify files match plan, verification command passes, no unplanned files modified. Not a full review agent — just a controller-side check.

4. **Wave checkpoints** — After all tasks in a wave complete, run the project test suite. Catch regressions before the next wave starts.

5. **Deferred commits** — Keep beastmode's unified commit at /release. Per-task commits (GSD/Superpowers style) create noisy history. Worktree isolation provides the safety net.

6. **Task persistence sync** — Update .tasks.json after each task completion to enable cross-session resume.

### Claude's Discretion

- Agent prompt template details (how much context to feed per task)
- Retry count before marking a task blocked (suggest 2)
- Whether to auto-fix lint issues as part of spec check
- Exact format of deviation log entries

## Component Breakdown

### 0-prime.md (revised)
1. Announce skill
2. Load project context (.beastmode/PRODUCT.md, context/IMPLEMENT.md, meta/IMPLEMENT.md)
3. Read plan from arguments
4. Enter feature worktree (from .beastmode/worktrees/<feature>)
5. **NEW:** Parse waves — extract wave numbers from all tasks, build dependency graph
6. **NEW:** Load task persistence (.tasks.json) — resume from last completed task if exists
7. Prepare environment (npm install or equivalent)

### 1-execute.md (rewritten)
1. **Wave loop** — for each wave (ascending order):
   a. Identify runnable tasks (all dependencies met, not yet completed)
   b. For each task: spawn Agent with full task text + relevant file contents + project conventions
   c. Agent implements code, runs task verification step, reports result + any deviations
   d. **Spec check** per task: files in plan modified? verification passes? unplanned files?
   e. **Deviation handling:**
      - Auto-fix: agent handles, tracks in result
      - Blocking: agent handles, tracks in result
      - Architectural: agent returns STOP signal → controller presents to user → wait
   f. **Wave checkpoint:** run project test suite, verify no regressions
   g. Update .tasks.json with completed tasks
2. If subagent fails after 2 retries: mark task blocked, continue with independent tasks
3. If blocked task has dependents in later waves: report to user

### 2-validate.md (enhanced)
1. Run full test suite
2. Run build (if applicable)
3. Run lint (if applicable)
4. **NEW:** Deviation summary — list all auto-fixes, blocking fixes, architectural decisions
5. If failures: **fix loop** (attempt fix, re-run, not just "stop and report")
6. Validation gate: all pass → proceed; any fail → report with actionable detail

### 3-checkpoint.md (enhanced)
1. **NEW:** Save deviation log to feature state
2. Phase retro (@_shared/retro.md)
3. Context report (@_shared/context-report.md)
4. Suggest /validate

### Subagent Prompt (new: implementer-agent.md)
- Receives: full task text, relevant file contents, project conventions, verification command
- Does: implement changes, run verification, report files changed + result + deviations
- Does NOT: read the plan file, commit, switch branches, modify unrelated files
- Returns: structured result (success/fail, files changed, deviations, verification output)

### Deviation Tracker (new: in controller)
- Three tiers: auto-fix, blocking, architectural
- Accumulated across all tasks
- Surfaced in validate phase and checkpoint
- Persisted in feature state for /release to reference

## Files Affected

| File | Action |
|------|--------|
| skills/implement/phases/0-prime.md | Rewrite — add wave parsing, task persistence |
| skills/implement/phases/1-execute.md | Rewrite — wave loop, subagent dispatch, deviation rules |
| skills/implement/phases/2-validate.md | Enhance — add deviation summary, fix loop |
| skills/implement/phases/3-checkpoint.md | Enhance — add deviation log persistence |
| skills/implement/references/constraints.md | Update — add subagent safety rules |
| skills/implement/references/implementer-agent.md | Create — subagent prompt template |
| skills/implement/references/deviation-rules.md | Create — deviation tier definitions |
| skills/plan/references/task-format.md | Review — ensure wave/depends format is implementation-ready |
| skills/_shared/task-runner.md | Review — may need wave-awareness hooks |

## Acceptance Criteria

- [ ] /implement respects wave ordering from plan (Wave 1 before Wave 2)
- [ ] Fresh subagent spawned per task (not all in main context)
- [ ] Independent tasks within a wave can run in parallel
- [ ] Per-task spec check: files match plan, verification passes
- [ ] Wave checkpoint: test suite runs between waves
- [ ] Auto-fix deviations handled without stopping
- [ ] Architectural deviations STOP and present to user
- [ ] .tasks.json updated after each task (cross-session resume)
- [ ] Deviation log saved in checkpoint
- [ ] Stale .agents/ paths replaced with .beastmode/
- [ ] Duplicate worktree entry removed from execute phase
- [ ] Existing plan format (task-format.md) works without changes

## Testing Strategy

- Execute /implement on a real plan with 3+ tasks across 2+ waves
- Verify subagents are spawned (not main-context execution)
- Introduce a deliberate type error to trigger auto-fix deviation
- Verify wave ordering (Wave 2 tasks don't start until Wave 1 completes)
- Kill session mid-implementation, restart, verify .tasks.json resume works
- Test with a plan that has no waves (backward compatibility — treat as Wave 1)

## Deferred Ideas

- Full two-stage review (spec + quality) per task — Superpowers-style. Start with lightweight spec check, upgrade if needed.
- Pattern routing (GSD-style) — adapt subagent strategy based on plan complexity. Start with always-subagent, optimize later.
- Per-task commits — could be an option flag for users who want rollback granularity.
- Codebase map updates after implementation (GSD does this) — tracked for a future /release enhancement.
