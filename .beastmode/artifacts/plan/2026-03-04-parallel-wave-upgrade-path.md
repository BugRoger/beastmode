# Parallel Wave Upgrade Path Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Add file isolation analysis to /plan and parallel dispatch to /implement, so waves execute in parallel only when file safety is guaranteed.

**Architecture:** Two-layer safety model. /plan's validate phase scans tasks per wave for file overlap, auto-resequences conflicting tasks into separate waves, and marks safe waves with `**Parallel-safe:** true`. /implement's execute phase verifies the flag before spawning agents in parallel, falling back to sequential if verification fails.

**Tech Stack:** Claude Code skill system (markdown prompts), Agent tool for subagent dispatch

**Design Doc:** .beastmode/state/design/2026-03-04-parallel-wave-upgrade-path.md

---

### Task 0: Add Parallel-safe flag to task-format.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/references/task-format.md:54-60`

**Step 1: Add Parallel-safe flag documentation to Wave Rules section**

Replace the current Wave Rules section (lines 55-60) with an expanded version that documents the `**Parallel-safe:**` flag:

```markdown
## Wave Rules

- **Wave 1** runs before **Wave 2**, etc.
- Tasks in the same wave with no `Depends on` can run in parallel — if the wave is marked parallel-safe
- `Depends on` creates ordering within a wave
- Default wave is 1 if omitted

### Parallel-Safe Flag

After all tasks are written, /plan's validate phase analyzes file overlap per wave and may add:

```
**Parallel-safe:** true
```

to the first task in a wave. This flag means no two tasks in the wave share a file, so /implement can dispatch agents in parallel.

- Written by /plan validation — not by the human planner
- If two tasks in a wave share a file, /plan auto-resequences the later task to Wave N+1
- Single-task waves are not flagged (nothing to parallelize)
- /implement verifies the flag at runtime before parallel dispatch
```

**Step 2: Verify the file reads correctly**

Run: `head -80 skills/plan/references/task-format.md`
Expected: Wave Rules section includes "Parallel-Safe Flag" subsection with the flag format and rules.

---

### Task 1: Add file isolation analysis to plan validate phase

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/phases/2-validate.md:1-41`

**Step 1: Add file isolation analysis step between Completeness Check and User Approval Gate**

Insert a new `## 3. File Isolation Analysis` section after the current `## 2. Completeness Check` and renumber User Approval Gate to `## 4.`

The full new file content should be:

```markdown
# 2. Validate

## 1. Design Coverage Check

Extract all components from the design doc's `## Components` or `## Key Decisions` sections. For each, verify it appears in at least one plan task.

Print a coverage table:

` ` `
Design Component          → Plan Task    Status
─────────────────────────────────────────────────
0-prime.md changes        → Task 1       ✓
1-execute.md changes      → Task 2       ✓
2-validate.md changes     → Task 4       ✓
task-format.md changes    → Task 3       ✓
` ` `

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

` ` `
Wave Isolation Summary
──────────────────────
Wave 1: 3 tasks, 0 overlaps → Parallel-safe: true
Wave 2: 1 task → skipped (single task)
Wave 3: 2 tasks, 1 overlap → resequenced Task 5 to Wave 4
` ` `

## 4. User Approval Gate

<HARD-GATE>
User must explicitly approve the plan before proceeding.
</HARD-GATE>

Ask: "Plan complete. Ready to save and proceed to implementation?"

Options:
- Yes, save and continue
- No, let's revise [specify what]
```

**Step 2: Verify the file reads correctly**

Run: `cat skills/plan/phases/2-validate.md`
Expected: Four sections: Design Coverage Check, Completeness Check, File Isolation Analysis, User Approval Gate. The File Isolation Analysis section contains the 6-step algorithm and summary format.

---

### Task 2: Add parallel dispatch path to implement execute phase

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/phases/1-execute.md:14-27`

**Step 1: Replace step 1.2 with parallel-aware dispatch**

Replace the current `### 1.2 Dispatch Subagent Per Task` section (lines 14-27) with:

```markdown
### 1.2 Dispatch Subagents

Check the wave's `**Parallel-safe:**` flag (appears after the first task's `**Wave:**` line).

**If Parallel-safe: true** — verify and dispatch in parallel:

1. Verify: collect all file paths from all tasks in this wave and confirm no file appears in 2+ tasks
2. If verification passes:
   - For each task: build the agent prompt (same as sequential — see below)
   - Spawn all agents with `Agent(subagent_type="general-purpose", prompt=<built prompt>, run_in_background=true)`
   - Collect all results via `TaskOutput(task_id=<agent_id>, block=true)`
   - Run spec check (1.3) on each result in order
3. If verification fails:
   - Log: `[Blocking] Wave N: parallel-safe flag incorrect, falling back to sequential`
   - Fall through to sequential dispatch below

**If no flag or Parallel-safe: false** — dispatch sequentially (default):

For each runnable task in the wave:

1. Read the task's **Files** section — pre-read the listed files
2. Build the agent prompt:
   - Read `@../references/implementer-agent.md` for the agent role
   - Append: full task text (all steps, files, verification)
   - Append: pre-read file contents
   - Append: project conventions from `.beastmode/context/IMPLEMENT.md`
3. Spawn: `Agent(subagent_type="general-purpose", prompt=<built prompt>)`
4. Collect the agent's result report
5. Run spec check (1.3) before dispatching next task
```

**Step 2: Verify the file reads correctly**

Run: `cat skills/implement/phases/1-execute.md`
Expected: Step 1.2 is titled "Dispatch Subagents" and contains both parallel (with `run_in_background=true`) and sequential paths. The parallel path includes a verification step before dispatch.

---

### Task 3: Add sequential-fallback deviation to deviation-rules.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/references/deviation-rules.md:19-30`

**Step 1: Add parallel-fallback as a Tier 2 Blocking example**

Add a new example to the Tier 2: Blocking section's examples list (after line 30, the "Circular import" example):

```markdown
- Parallel-safe flag incorrect — file overlap detected at dispatch time, falling back to sequential
```

**Step 2: Add parallel-fallback to the Deviation Log Format**

Add a new example to the deviation log format section (after line 72, the Blocking example):

```markdown
    - [Blocking] Wave 2: Parallel-safe flag incorrect, fell back to sequential dispatch
```

**Step 3: Verify the file reads correctly**

Run: `cat skills/implement/references/deviation-rules.md`
Expected: Tier 2 Blocking section includes the parallel-fallback example. Deviation Log Format includes a wave-level blocking example.

---
