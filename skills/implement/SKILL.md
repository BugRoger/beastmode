---
name: implement
description: Execute implementation plans — implementing, coding, building. Use after plan. Dispatches subagent per task with wave ordering, deviation handling, and spec checks.
---

# /implement

Load plan, dispatch subagents per task in wave order, verify completion.

<HARD-GATE>
No EnterPlanMode or ExitPlanMode.
</HARD-GATE>

## Guiding Principles

- **One agent per task** — controller owns the plan, agents own the code
- **Deviations are normal** — classify and handle systematically
- **Spec check every result** — files match plan, verification passes, no unplanned changes
- **Wave ordering drives parallelism** — foundation before consumers

## Phase 0: Prime

### 1. Resolve Feature Name

The argument is `<design>-<feature-slug>`. Parse the design name and feature slug from it. The feature name is used for all artifact paths in this phase.

### 2. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

### 3. Load Project Context

Read (if they exist):
- `.beastmode/context/IMPLEMENT.md`

Follow L2 convention paths (`context/implement/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

### 4. Resolve Feature Plan

1. Locate the feature plan by convention glob:

```bash
matches=$(ls .beastmode/artifacts/plan/*-$design-$feature.md 2>/dev/null)
```

If no matches, error: "No feature plan found for '$design/$feature'". If multiple, take the latest (date prefix sorts chronologically).

2. Read the feature plan file
3. Read the architectural decisions from the plan's design reference

### 5. Capture Baseline Snapshot

Before any implementation begins, capture the current state of changed files:

```bash
git diff --name-only HEAD > /tmp/beastmode-baseline-$(date +%s).txt
```

Store the baseline file list. Spec checks in execute will diff against this baseline to avoid flagging files from prior feature implementations.

### 6. Prepare Environment

    # Install dependencies if needed
    npm install  # or appropriate command from .beastmode/context/

## Phase 1: Execute

### 0. Decompose Feature into Tasks

Before dispatching, create a detailed task breakdown from the architectural feature plan.

1. **Read feature plan** — user stories, what to build, acceptance criteria
2. **Read architectural decisions** from the design doc — these are constraints
3. **Explore codebase** — identify exact files, patterns, test structure, dependencies
4. **Create tasks** using the Task Format (see below):
   - Map each aspect of "What to Build" to one or more tasks
   - Include exact file paths discovered from codebase exploration
   - Include complete code in steps
   - Assign wave numbers based on dependencies
   - Include verification steps with expected output
5. **Save internal plan** to `.beastmode/artifacts/plan/YYYY-MM-DD-<design>-<feature-slug>.tasks.json`:
   ```json
   {
     "featurePlan": "<path-to-feature-plan.md>",
     "tasks": [
       {"id": 0, "subject": "Task 0: ...", "status": "pending"},
       {"id": 1, "subject": "Task 1: ...", "status": "pending"}
     ],
     "lastUpdated": "<timestamp>"
   }
   ```

### 1. Parse Waves

Extract wave numbers and dependencies from the tasks created in Decompose:

1. For each task, extract `**Wave:**` and `**Depends on:**` fields
2. Group tasks by wave number (default wave = 1 if omitted)
3. Within each wave, build dependency order from `Depends on` field

### 2. Wave Loop

For each wave (ascending order):

1. **Identify Runnable Tasks** — From the wave map, select tasks where:
   - Task belongs to current wave
   - All dependencies are completed (or no dependencies)
   - Task is not already completed (from .tasks.json resume)

2. **Dispatch Subagents** — Check the wave's `**Parallel-safe:**` flag (appears after the first task's `**Wave:**` line).

   **If Parallel-safe: true** — verify and dispatch in parallel:

   1. Verify: collect all file paths from all tasks in this wave and confirm no file appears in 2+ tasks
   2. If verification passes:
      - For each task: build the agent prompt (same as sequential — see below)
      - Spawn all agents with `Agent(subagent_type="general-purpose", prompt=<built prompt>, run_in_background=true)`
      - Collect all results via `TaskOutput(task_id=<agent_id>, block=true)`
      - Run spec check (step 3) on each result in order
   3. If verification fails:
      - Log: `[Blocking] Wave N: parallel-safe flag incorrect, falling back to sequential`
      - Fall through to sequential dispatch below

   **If no flag or Parallel-safe: false** — dispatch sequentially (default):

   For each runnable task in the wave:

   1. Read the task's **Files** section — pre-read the listed files
   2. Build the agent prompt:
      - Use the implementer agent role: It receives a single task spec with steps, files, and verification commands. It executes each step, classifies deviations, runs verification, and reports results. It does NOT read the plan file, commit changes, switch branches, or modify files outside its task's file list.
      - Append: full task text (all steps, files, verification)
      - Append: pre-read file contents
      - Append: project conventions from `.beastmode/context/IMPLEMENT.md`
   3. Spawn: `Agent(subagent_type="general-purpose", prompt=<built prompt>)`
   4. Collect the agent's result report
   5. Run spec check (step 3) before dispatching next task

3. **Spec Check** — After each agent completes, the controller verifies:

   1. **Files match plan?** — Check that files listed in the task's `**Files:**` section were actually modified
   2. **Verification passes?** — Run the task's verification command if the agent didn't already
   3. **No unplanned files?** — Compare `git diff --name-only` against baseline snapshot (from prime step 5) + plan's file list. Only flag files that are NEW since baseline AND not in the current task's file list.

   If spec check fails:
   - Re-dispatch the same task to a new agent with the failure context
   - After 2 retries: mark task as blocked, report to user

4. **Handle Deviations** — Process the agent's deviation report per the Deviation Rules (see Reference section):

   - **Auto-fix / Blocking**: Log to deviation tracker, continue

   **Architectural Deviation:** Evaluate the deviation and proceed with the proposed change. If clearly safe, continue. If ambiguous, proceed cautiously and log.

5. **Update Task Persistence** — After each task completes (or is blocked):

   1. Update `.beastmode/artifacts/plan/YYYY-MM-DD-<design>-<feature-slug>.tasks.json`:
      - Set task status to `completed` or `blocked`
      - Set `lastUpdated` timestamp

6. **Wave Checkpoint** — After ALL tasks in the current wave complete:

   1. Run the project test suite (command from `.beastmode/context/implement/testing.md`)
   2. If tests fail:
      - Identify which task likely caused the regression
      - Re-dispatch that task with failure context
      - After 2 retries: mark wave as blocked, report to user
   3. If tests pass: proceed to next wave

### 3. Blocked Task Resolution

If a task is blocked and has dependents in later waves:
- Report to user: "Task N is blocked. Tasks [X, Y] in Wave M depend on it."

Investigate the blocked task. If resolvable, fix and continue. If not, skip dependent tasks and log.

### 4. Completion

When all waves complete:
- Report: "Implementation complete. N tasks done, M deviations tracked."
- Proceed to validate phase.

## Phase 2: Validate

### 1. Run Tests

    # Run project test command (from .beastmode/context/implement/testing.md)
    npm test  # or appropriate command

Capture output and exit code.

### 2. Run Build (if applicable)

    npm run build  # or appropriate command

### 3. Run Lint (if applicable)

    npm run lint  # or appropriate command

### 4. Check Results

- All tests pass? ✓/✗
- Build succeeds? ✓/✗
- No lint errors? ✓/✗

### 5. Fix Loop

If any check fails:
1. Analyze the failure — identify root cause
2. Attempt a targeted fix (scope to the failing area)
3. Re-run the failing check
4. If fixed: continue to next check
5. If still failing after 2 attempts: report to user with actionable detail

Do NOT just "stop and report" on first failure. Attempt a fix first.

### 6. Deviation Summary

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

### 7. Validation Failure Handling

If any check still fails after fix loop:
- Report failures with full context

Attempt additional investigation and targeted fixes. After exhausting options, log the failures and proceed to checkpoint with a warning.
Do NOT proceed to next phase if critical tests fail.

## Phase 3: Checkpoint

### 1. Save Deviation Log

Save to `.beastmode/artifacts/implement/YYYY-MM-DD-<design>-<feature-slug>.md`:

IMPORTANT: The filename MUST be exactly `YYYY-MM-DD-<design>-<feature-slug>.md` — no
extra suffixes like `-deviations`. The stop hook derives the output.json filename from
this basename, and the watch loop matches on `-<epic>-<feature>.output.json`. Any extra
suffix breaks the match and the watch loop never sees completion.

    # Implementation Deviations: <feature-slug>

    **Date:** YYYY-MM-DD
    **Feature Plan:** .beastmode/artifacts/plan/YYYY-MM-DD-<design>-<feature-slug>.md
    **Tasks completed:** N/M
    **Deviations:** N total

    ## Auto-Fixed
    - Task N: <description>

    ## Blocking
    - Task N: <description>

    ## Architectural
    - Task N: <description> — User decision: <choice>

If no deviations, still write this file with "Deviations: 0" and "No deviations" body.
This file MUST always be written — the stop hook reads its frontmatter to generate
output.json, which the watch loop uses to detect completion.

The artifact MUST begin with YAML frontmatter:

```yaml
---
phase: implement
slug: <hex>
epic: <design>
feature: <feature-slug>
status: completed
---
```

Set `status` to `completed` if all tasks passed, `error` if any task is blocked.

### 2. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "implement(<feature>): checkpoint"
```

Print:

```
Next: beastmode validate <feature>
```

STOP. No additional output.

## Constraints

### No Plan Mode

**NEVER call `EnterPlanMode` or `ExitPlanMode` during this skill.** This skill operates in normal mode. Calling either traps or breaks the workflow.

### Working Directory Isolation

- Never work directly on main/master branch
- The CLI provides the working directory — skills don't manage worktrees
- Each phase commits to the feature branch at checkpoint
- Merge happens only at /release

### Subagent Safety

- Spawn ONE agent per task (never parallel implementer agents on the same wave — file conflicts)
- Controller stays in the working directory — agents inherit it
- Agents must NOT commit, push, or switch branches
- Agents must NOT read the plan file — controller provides task text
- Agents must NOT modify files outside their task's file list
- If an agent returns ARCHITECTURAL_STOP, controller must present to user before continuing

### Deviation Handling

- Auto-fix and Blocking deviations: agents handle autonomously
- Architectural deviations: agents STOP, controller escalates to user
- All deviations tracked in deviation log for checkpoint
- See the Deviation Rules in Reference section for full taxonomy

## Reference

### Deviation Rules

Deviations from the plan are normal. Classify and handle them systematically.

### Tier 1: Auto-Fix

**Trigger:** Bug, wrong type, missing import, broken test, security vulnerability, missing validation
**Action:** Fix it, track it, keep going
**Permission:** Automatic — no user approval needed

Examples:
- Import statement missing
- Type mismatch between function signature and usage
- Missing null check causing runtime error
- Test assertion using wrong matcher

Track as: `[Auto-fix] Task N: <description>`

### Tier 2: Blocking

**Trigger:** Missing dependency, environment issue, build broken, config missing, circular dependency
**Action:** Fix the blocker, track it, keep going
**Permission:** Automatic — no user approval needed

Examples:
- Package not in dependencies
- Environment variable not set
- Build tool config missing
- Circular import preventing compilation
- Parallel-safe flag incorrect — file overlap detected at dispatch time, falling back to sequential

Track as: `[Blocking] Task N: <description>`

### Tier 3: Architectural

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

### Priority

Tier 3 (STOP) > Tier 1-2 (auto) > Unsure → Tier 3

### Heuristic

- Affects correctness/security/completion? → Tier 1 or 2
- Changes architecture or scope? → Tier 3
- Not sure? → Tier 3 (safer to ask)

### Deviation Log Format

Accumulated during execution, saved at checkpoint:

    ## Deviations

    - [Auto-fix] Task 3: Added missing `zod` import in validation.ts
    - [Blocking] Task 5: Installed `@types/node` — not in plan dependencies
    - [Blocking] Wave 2: Parallel-safe flag incorrect, fell back to sequential dispatch
    - [Architectural] Task 7: User approved adding Redis cache layer

    **Summary:** 2 auto-fixed, 1 blocking, 1 architectural (approved)

If no deviations: `## Deviations\n\nNone — plan executed exactly as written.`

### Task Format

> Used by /implement's Decompose step to create detailed task breakdowns from feature plans.

### Bite-Sized Granularity

Each step is one action (2-5 minutes):
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step

### Task Structure

```markdown
### Task N: [Component Name]

**Wave:** [integer, default 1]
**Depends on:** [Task references, or `-` if none]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

\`\`\`python
def test_specific_behavior():
    result = function(input)
    assert result == expected
\`\`\`

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

\`\`\`python
def function(input):
    return expected
\`\`\`

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Verify**

Run all related tests to confirm nothing broke.
No commit needed — unified commit at /release.
```

### Wave Rules

- **Wave 1** runs before **Wave 2**, etc.
- Tasks in the same wave with no `Depends on` can run in parallel — if the wave is marked parallel-safe
- `Depends on` creates ordering within a wave
- Default wave is 1 if omitted

**Parallel-Safe Flag** — After all tasks are written, /implement's Decompose step analyzes file overlap per wave and may add:

```
**Parallel-safe:** true
```

to the first task in a wave. This flag means no two tasks in the wave share a file, so dispatch can run agents in parallel.

- Written by the Decompose step — not by the human planner
- If two tasks in a wave share a file, auto-resequence the later task to Wave N+1
- Single-task waves are not flagged (nothing to parallelize)
- Verify the flag at runtime before parallel dispatch

### Remember

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant docs/designs with links
- DRY, YAGNI, TDD (commits at /release only)
