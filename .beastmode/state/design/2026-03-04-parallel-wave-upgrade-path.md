# Parallel Wave Upgrade Path

## Goal

Define the requirements and mechanism for upgrading /implement's wave dispatch from sequential (current) to parallel, so that parallel execution is unlocked only when file isolation is guaranteed.

## Approach Summary

Two-layer safety model: /plan certifies file isolation per wave at plan time, /implement verifies before parallel dispatch at runtime. Sequential is the default. Parallel is unlocked per-wave only when both layers agree. When /plan finds overlapping files within a wave, it auto-resequences tasks into separate waves instead of rejecting the plan.

## Key Decisions

### Locked Decisions

1. **Both layers — plan hints, implement verifies** — /plan performs static analysis of `**Files:**` sections and marks safe waves. /implement re-checks file lists before parallel dispatch. Belt and suspenders — a wrong plan flag never causes file conflicts.

2. **Auto-resequence overlapping tasks** — When /plan finds two tasks in the same wave that share a file, it moves the later task to Wave N+1 and updates `**Depends on:**` accordingly. The plan stays valid and gains a wave rather than failing validation. This keeps the planner ergonomic — you don't need to think about file isolation when writing tasks.

3. **Auto-detect from plan flag** — /implement defaults to sequential. It switches to parallel only when the wave has `**Parallel-safe:** true` AND its own file-list verification confirms no overlap. No user flags or configuration needed.

### Claude's Discretion

- Exact algorithm for file path matching (glob-aware vs. exact string match)
- How to handle test files (shared test fixtures could be read-only safe)
- Log format for sequential fallback deviation entries
- Whether to print parallel/sequential mode per wave to user

## Component Breakdown

### /plan — Wave File Isolation Analysis (new validation step)

Added after tasks are written, before plan output is finalized:

1. For each wave with 2+ tasks, collect all paths from `**Files:**` sections (Create, Modify, Test)
2. Build a file → task map
3. If any file maps to 2+ tasks:
   - Move the later task(s) to a new Wave N+1
   - Add `**Depends on:** Task [original-task]` if not already present
   - Re-run analysis on the new wave (cascading splits are possible)
4. For each wave with 2+ tasks and no overlap: add `**Parallel-safe:** true` to the wave header
5. Single-task waves: no flag (nothing to parallelize)

### /implement — Parallel Dispatch (upgrade to execute step 1.2)

Replace current sequential-only dispatch:

1. Read wave's `**Parallel-safe:**` flag
2. If `true`:
   - Verify: compare file lists across all tasks in the wave
   - If verified: spawn all agents with `run_in_background: true`, collect results via TaskOutput
   - If verification fails: log `[Blocking] Wave N: parallel-safe flag incorrect, falling back to sequential`, dispatch sequentially
3. If no flag or `false`: sequential dispatch (current behavior unchanged)

### task-format.md — Wave Header Extension

Add optional wave-level metadata:

```markdown
**Wave N:**
**Parallel-safe:** true|false
```

The flag is written by /plan's validation step, not by the human planner.

## Files Affected

| File | Action |
|------|--------|
| skills/plan/phases/2-validate.md (or 1-execute.md) | Add file isolation analysis step |
| skills/plan/references/task-format.md | Document `**Parallel-safe:**` flag |
| skills/implement/phases/1-execute.md | Add parallel dispatch path in step 1.2 |
| skills/implement/references/deviation-rules.md | Add sequential-fallback deviation type |

## Acceptance Criteria

- [ ] /plan detects file overlap between tasks in the same wave
- [ ] Overlapping tasks are auto-resequenced into separate waves
- [ ] `**Parallel-safe:** true` flag added to waves with verified file isolation
- [ ] /implement verifies file isolation before parallel dispatch
- [ ] /implement falls back to sequential when verification fails
- [ ] Sequential dispatch remains the default for unflagged waves
- [ ] Auto-resequencing updates `**Depends on:**` references correctly
- [ ] Single-task waves are not flagged (no-op)

## Testing Strategy

- Create a plan with 2 tasks in Wave 1 that share a file → verify auto-resequence splits them
- Create a plan with 2 tasks in Wave 1 with isolated files → verify `Parallel-safe: true` flag
- Run /implement on a parallel-safe wave → verify agents spawn with `run_in_background: true`
- Manually corrupt a parallel-safe flag (add overlap) → verify /implement falls back to sequential
- Test cascading resequence: 3 tasks in Wave 1, task A and B share file X, task B and C share file Y → all three end up in separate waves

## Deferred Ideas

- **Read-only file detection** — If a task only reads a file (e.g., imports from it), it may be safe to parallelize even with "overlap." Requires distinguishing read vs. write in the Files section.
- **Partial-wave parallelism** — If 3 tasks are in a wave and only 2 conflict, run the isolated one in parallel with the sequential pair. Adds complexity for marginal gain.
- **User override** — A `--force-parallel` flag that skips verification. For power users who know their plan is safe despite file list overlap.
