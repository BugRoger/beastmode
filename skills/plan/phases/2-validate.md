# 2. Validate

## 1. Design Coverage Check

Extract all components from the design doc's `## Components` or `## Key Decisions` sections. For each, verify it appears in at least one plan task.

Print a coverage table:

```
Design Component          → Plan Task    Status
─────────────────────────────────────────────────
0-prime.md changes        → Task 1       ✓
1-execute.md changes      → Task 2       ✓
2-validate.md changes     → Task 4       ✓
task-format.md changes    → Task 3       ✓
```

If any component shows `✗ MISSING`, go back to Execute phase and add the missing task.

## 2. Completeness Check

Verify every task has:
- [ ] Files section with exact paths
- [ ] Wave and Depends on fields
- [ ] Steps with code or commands
- [ ] Verification step

If incomplete, go back to Execute phase.

## 3. File Isolation Analysis

For each wave with 2+ tasks:

1. Collect all file paths from `**Files:**` sections (Create, Modify, Test) across all tasks in the wave
2. Strip line-number suffixes (e.g., `file.md:10-20` → `file.md`) for comparison
3. Build a file → task map
4. If any file appears in 2+ tasks:
   - Move the later task(s) to a new wave (current wave number + 1)
   - Shift all subsequent wave numbers up to avoid collision
   - Add `**Depends on:** Task [conflicting-task]` if not already present
   - Re-run analysis on the new wave (cascading splits are possible)
5. For each wave with 2+ tasks and no file overlap: add `**Parallel-safe:** true` after the first task's `**Wave:**` line
6. Single-task waves: no flag (nothing to parallelize)

Print a summary:

```
Wave Isolation Summary
──────────────────────
Wave 1: 3 tasks, 0 overlaps → Parallel-safe: true
Wave 2: 1 task → skipped (single task)
Wave 3: 2 tasks, 1 overlap → resequenced Task 5 to Wave 4
```

## 4. [GATE|plan.plan-approval]

Read `.beastmode/config.yaml` → resolve mode for `plan.plan-approval`.
Default: `human`.

### [GATE-OPTION|human] User Approval

Ask: "Plan complete. Ready to save and proceed to implementation?"

Options:
- Yes, save and continue
- No, let's revise [specify what]

Wait for user response before continuing.

### [GATE-OPTION|auto] Self-Approve

Log: "Gate `plan.plan-approval` → auto: approved"
Proceed to checkpoint.
