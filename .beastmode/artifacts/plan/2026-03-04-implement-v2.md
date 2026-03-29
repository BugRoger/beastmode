# Implement v2 Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Redesign /implement to use subagent-per-task execution with wave-based parallelism, three-tier deviation rules, lightweight spec checks, and wave checkpoints.

**Architecture:** Wave-based subagent dispatch model. Controller (main context) stays lean — reads plan, groups by wave, spawns agents, collects results, runs verification. Three deviation tiers (auto-fix, blocking, architectural) replace "stop and report."

**Tech Stack:** Claude Code skill system (markdown prompts), Agent tool for subagent dispatch

**Design Doc:** .beastmode/state/design/2026-03-04-implement-v2.md

---

### Task 0: Create deviation-rules.md reference

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `skills/implement/references/deviation-rules.md`

**Step 1: Write the deviation rules reference**

Create `skills/implement/references/deviation-rules.md` with the three-tier deviation taxonomy:

```markdown
# Deviation Rules

Deviations from the plan are normal. Classify and handle them systematically.

## Tier 1: Auto-Fix

**Trigger:** Bug, wrong type, missing import, broken test, security vulnerability, missing validation
**Action:** Fix it, track it, keep going
**Permission:** Automatic — no user approval needed

Examples:
- Import statement missing
- Type mismatch between function signature and usage
- Missing null check causing runtime error
- Test assertion using wrong matcher

Track as: `[Auto-fix] Task N: <description>`

## Tier 2: Blocking

**Trigger:** Missing dependency, environment issue, build broken, config missing, circular dependency
**Action:** Fix the blocker, track it, keep going
**Permission:** Automatic — no user approval needed

Examples:
- Package not in dependencies
- Environment variable not set
- Build tool config missing
- Circular import preventing compilation

Track as: `[Blocking] Task N: <description>`

## Tier 3: Architectural

**Trigger:** Schema change, new service, API change, library switch, scope expansion, breaking change
**Action:** STOP, present to user, wait for decision
**Permission:** Required — user must approve before proceeding

Present format:

    Architectural Decision Needed

    Task: [current task]
    Discovery: [what prompted this]
    Proposed change: [what needs to change]
    Impact: [what this affects]

    Options:
    1. Proceed with proposed change
    2. Different approach: [alternative]
    3. Defer and skip this task

Track as: `[Architectural] Task N: <description> — User chose: <decision>`

## Priority

Tier 3 (STOP) > Tier 1-2 (auto) > Unsure → Tier 3

## Heuristic

- Affects correctness/security/completion? → Tier 1 or 2
- Changes architecture or scope? → Tier 3
- Not sure? → Tier 3 (safer to ask)

## Deviation Log Format

Accumulated during execution, saved at checkpoint:

    ## Deviations

    - [Auto-fix] Task 3: Added missing `zod` import in validation.ts
    - [Blocking] Task 5: Installed `@types/node` — not in plan dependencies
    - [Architectural] Task 7: User approved adding Redis cache layer

    **Summary:** 2 auto-fixed, 1 blocking, 1 architectural (approved)

If no deviations: `## Deviations\n\nNone — plan executed exactly as written.`
```

**Step 2: Verify file exists**

Run: `cat skills/implement/references/deviation-rules.md | head -5`
Expected: `# Deviation Rules` header visible

---

### Task 1: Create implementer-agent.md reference

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `skills/implement/references/implementer-agent.md`

**Step 1: Write the implementer agent prompt**

Create `skills/implement/references/implementer-agent.md`:

```markdown
# Implementer Agent

You are an implementation subagent. You receive a single task from an implementation plan and execute it.

## What You Receive

- **Task text**: The full task description with steps, files, and verification
- **Project conventions**: From .beastmode/context/IMPLEMENT.md
- **Relevant file contents**: Pre-read by the controller

## What You Do

1. Read the task steps carefully
2. For each step:
   - Execute the step (write code, run commands)
   - If a step fails, classify the deviation (see below)
3. Run the task's verification command
4. Report your results

## What You Do NOT Do

- Read the plan file (controller provides your task text)
- Commit changes (deferred to /release)
- Switch branches or leave the worktree
- Modify files not listed in your task
- Read files unrelated to your task

## Deviation Classification

When something goes wrong or deviates from the plan:

**Auto-fix** (just fix it):
- Missing import, wrong type, broken test assertion
- Missing null check, incorrect variable name
- Track: "Auto-fix: <description>"

**Blocking** (fix the blocker):
- Missing package/dependency
- Missing config or environment variable
- Build tool issue
- Track: "Blocking: <description>"

**Architectural** (STOP):
- Need a new database table or schema change
- Need to switch libraries
- Scope of change exceeds task boundaries
- Return: "ARCHITECTURAL: <description>" — do NOT proceed

## Report Format

When done, report:

    ## Result: SUCCESS | FAIL | ARCHITECTURAL_STOP

    ### Files Changed
    - modified: path/to/file.ts
    - created: path/to/new-file.ts

    ### Verification
    - Command: <verification command from task>
    - Output: <actual output>
    - Status: PASS | FAIL

    ### Deviations
    - [Auto-fix] <description>
    - [Blocking] <description>

    ### Notes
    <any context the controller should know>

## Constraints

- Work ONLY on your assigned task
- Stay in the worktree directory
- Do not run `git commit`, `git push`, or `git checkout`
- If unsure about scope, return ARCHITECTURAL_STOP
```

**Step 2: Verify file exists**

Run: `cat skills/implement/references/implementer-agent.md | head -5`
Expected: `# Implementer Agent` header visible

---

### Task 2: Update constraints.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/references/constraints.md`

**Step 1: Rewrite constraints to include subagent safety rules**

Replace the full content of `skills/implement/references/constraints.md` with:

```markdown
# Implement Constraints

## No Plan Mode

**NEVER call `EnterPlanMode` or `ExitPlanMode` during this skill.** This skill operates in normal mode. Calling either traps or breaks the workflow.

## Worktree Isolation

- Never work directly on main/master branch
- All work happens in isolated worktree at `.beastmode/worktrees/`
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
```

**Step 2: Verify**

Run: `grep "Subagent Safety" skills/implement/references/constraints.md`
Expected: `## Subagent Safety`

---

### Task 3: Rewrite 0-prime.md

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2

**Files:**
- Modify: `skills/implement/phases/0-prime.md`

**Step 1: Rewrite 0-prime.md with wave parsing and task persistence**

Replace the full content of `skills/implement/phases/0-prime.md` with:

```markdown
# 0. Prime

## 1. Announce Skill

"I'm using the /implement skill to execute the implementation plan."

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/IMPLEMENT.md`
- `.beastmode/meta/IMPLEMENT.md`

## 3. Read Plan

Load the plan from arguments (e.g., `.beastmode/state/plan/YYYY-MM-DD-<topic>.md`).

## 4. Enter Feature Worktree

**MANDATORY — do not skip this step.**

Read the worktree path from the feature name and `cd` into it:

    feature="<feature-name>"  # from plan doc filename
    worktree_path=".beastmode/worktrees/$feature"
    if [ ! -d "$worktree_path" ]; then
      echo "Error: Worktree not found at $worktree_path"
      exit 1
    fi
    cd "$worktree_path"
    pwd  # confirm you are in the worktree

If the worktree directory doesn't exist, STOP and tell the user — do not continue on main.

See @../_shared/worktree-manager.md for full reference.

## 5. Prepare Environment

    # Install dependencies if needed
    npm install  # or appropriate command from .beastmode/context/

## 6. Parse Waves

Extract wave numbers and dependencies from all tasks in the plan:

1. Scan for `### Task N:` headings
2. For each task, extract `**Wave:**` and `**Depends on:**` fields
3. Group tasks by wave number (default wave = 1 if omitted)
4. Within each wave, build dependency order from `Depends on` field
5. Store as internal wave map:

    Wave 1: [Task 0 (no deps), Task 1 (no deps), Task 2 (depends: Task 1)]
    Wave 2: [Task 3 (depends: Task 0, Task 2)]

## 7. Load Task Persistence

Read `.beastmode/state/plan/YYYY-MM-DD-<feature>.tasks.json` if it exists.

- If found: skip already-completed tasks, resume from first pending task
- If not found: all tasks start as pending (first run)

Initialize deviation log as empty list.
```

**Step 2: Verify**

Run: `grep "Parse Waves" skills/implement/phases/0-prime.md`
Expected: `## 6. Parse Waves`

---

### Task 4: Rewrite 1-execute.md

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2

**Files:**
- Modify: `skills/implement/phases/1-execute.md`

**Step 1: Rewrite 1-execute.md with wave loop and subagent dispatch**

Replace the full content of `skills/implement/phases/1-execute.md` with:

```markdown
# 1. Execute

## 1. Wave Loop

For each wave (ascending order):

### 1.1 Identify Runnable Tasks

From the wave map (built in prime), select tasks where:
- Task belongs to current wave
- All dependencies are completed (or no dependencies)
- Task is not already completed (from .tasks.json resume)

### 1.2 Dispatch Subagent Per Task

For each runnable task in the wave:

1. Read the task's **Files** section — pre-read the listed files
2. Build the agent prompt:
   - Read `@../references/implementer-agent.md` for the agent role
   - Append: full task text (all steps, files, verification)
   - Append: pre-read file contents
   - Append: project conventions from `.beastmode/context/IMPLEMENT.md`
3. Spawn: `Agent(subagent_type="general-purpose", prompt=<built prompt>)`
4. Collect the agent's result report

**Sequential within a wave** — spawn one agent at a time to avoid file conflicts. (Parallel dispatch is a future optimization when plans guarantee file isolation per task.)

### 1.3 Spec Check

After each agent completes, the controller verifies:

1. **Files match plan?** — Check that files listed in the task's `**Files:**` section were actually modified
2. **Verification passes?** — Run the task's verification command if the agent didn't already
3. **No unplanned files?** — Check `git diff --name-only` against the plan's file list. Flag unexpected changes.

If spec check fails:
- Re-dispatch the same task to a new agent with the failure context
- After 2 retries: mark task as blocked, report to user

### 1.4 Handle Deviations

Process the agent's deviation report per @../references/deviation-rules.md:

- **Auto-fix / Blocking**: Log to deviation tracker, continue
- **Architectural**: Present to user via AskUserQuestion:
  - "Proceed with proposed change"
  - "Different approach" (user specifies)
  - "Skip this task" (mark blocked)

### 1.5 Update Task Persistence

After each task completes (or is blocked):

1. Update `.beastmode/state/plan/YYYY-MM-DD-<feature>.tasks.json`:
   - Set task status to `completed` or `blocked`
   - Set `lastUpdated` timestamp
2. Update TodoWrite

### 1.6 Wave Checkpoint

After ALL tasks in the current wave complete:

1. Run the project test suite (command from `.beastmode/context/implement/testing.md`)
2. If tests fail:
   - Identify which task likely caused the regression
   - Re-dispatch that task with failure context
   - After 2 retries: mark wave as blocked, report to user
3. If tests pass: proceed to next wave

## 2. Blocked Task Handling

If a task is blocked and has dependents in later waves:
- Report to user: "Task N is blocked. Tasks [X, Y] in Wave M depend on it."
- Ask: "Skip dependent tasks or investigate?"

## 3. Completion

When all waves complete:
- Report: "Implementation complete. N tasks done, M deviations tracked."
- Proceed to validate phase.
```

**Step 2: Verify**

Run: `grep "Wave Loop" skills/implement/phases/1-execute.md`
Expected: `## 1. Wave Loop`

---

### Task 5: Enhance 2-validate.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `skills/implement/phases/2-validate.md`

**Step 1: Rewrite 2-validate.md with deviation summary and fix loop**

Replace the full content of `skills/implement/phases/2-validate.md` with:

```markdown
# 2. Validate

## 1. Run Tests

    # Run project test command (from .beastmode/context/implement/testing.md)
    npm test  # or appropriate command

Capture output and exit code.

## 2. Run Build (if applicable)

    npm run build  # or appropriate command

## 3. Run Lint (if applicable)

    npm run lint  # or appropriate command

## 4. Check Results

- All tests pass? ✓/✗
- Build succeeds? ✓/✗
- No lint errors? ✓/✗

## 5. Fix Loop

If any check fails:
1. Analyze the failure — identify root cause
2. Attempt a targeted fix (scope to the failing area)
3. Re-run the failing check
4. If fixed: continue to next check
5. If still failing after 2 attempts: report to user with actionable detail

Do NOT just "stop and report" on first failure. Attempt a fix first.

## 6. Deviation Summary

Print the accumulated deviation log from the execute phase:

    ### Deviation Summary

    Auto-fixed: N
    - [Auto-fix] Task 3: Added missing import
    - [Auto-fix] Task 5: Fixed type mismatch

    Blocking: N
    - [Blocking] Task 7: Installed missing package

    Architectural: N
    - [Architectural] Task 9: User approved cache layer

    Total: N deviations (N auto-fixed, N blocking, N architectural)

If no deviations: "No deviations — plan executed exactly as written."

## 7. Validation Gate

If all checks pass:
- Proceed to checkpoint

If any check still fails after fix loop:
- Report failures with full context
- Do NOT proceed to checkpoint
- Ask user: "Fix manually and re-run /implement, or investigate together?"
```

**Step 2: Verify**

Run: `grep "Fix Loop" skills/implement/phases/2-validate.md`
Expected: `## 5. Fix Loop`

---

### Task 6: Enhance 3-checkpoint.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `skills/implement/phases/3-checkpoint.md`

**Step 1: Rewrite 3-checkpoint.md with deviation log persistence**

Replace the full content of `skills/implement/phases/3-checkpoint.md` with:

```markdown
# 3. Checkpoint

## 1. Save Deviation Log

If deviations were tracked during execution, save to `.beastmode/state/implement/YYYY-MM-DD-<feature>-deviations.md`:

    # Implementation Deviations: <feature>

    **Date:** YYYY-MM-DD
    **Plan:** .beastmode/state/plan/YYYY-MM-DD-<feature>.md
    **Tasks completed:** N/M
    **Deviations:** N total

    ## Auto-Fixed
    - Task N: <description>

    ## Blocking
    - Task N: <description>

    ## Architectural
    - Task N: <description> — User decision: <choice>

If no deviations, skip this step.

## 2. Phase Retro

@../_shared/retro.md

## 3. Context Report

@../_shared/context-report.md

## 4. Suggest Next Step

    /validate
```

**Step 2: Verify**

Run: `grep "Save Deviation Log" skills/implement/phases/3-checkpoint.md`
Expected: `## 1. Save Deviation Log`

---

### Task 7: Update SKILL.md

**Wave:** 3
**Depends on:** Task 3, Task 4, Task 5, Task 6

**Files:**
- Modify: `skills/implement/SKILL.md`

**Step 1: Update SKILL.md description and phase summaries**

Replace the full content of `skills/implement/SKILL.md` with:

```markdown
---
name: implement
description: Execute implementation plans — implementing, coding, building. Use after plan. Dispatches subagent per task with wave ordering, deviation handling, and spec checks.
---

# /implement

Load plan, dispatch subagents per task in wave order, verify completion.

<HARD-GATE>
No EnterPlanMode or ExitPlanMode — worktree isolation only. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load plan, parse waves, enter worktree
1. [Execute](phases/1-execute.md) — Dispatch agents, spec check, wave checkpoints
2. [Validate](phases/2-validate.md) — Run tests, deviation summary, fix loop
3. [Checkpoint](phases/3-checkpoint.md) — Save deviations, suggest /validate

@_shared/task-runner.md
```

**Step 2: Verify**

Run: `grep "subagent" skills/implement/SKILL.md`
Expected: match on "Dispatches subagent per task" in description
