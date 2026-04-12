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
- **Four statuses, not three tiers** — DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED
- **Two-stage review** — spec compliance first, code quality second
- **Wave ordering drives sequencing** — foundation before consumers
- **All user input via `AskUserQuestion`** — freeform print-and-wait is invisible to HITL hooks; every question the user must answer goes through `AskUserQuestion`
- **Model escalation** — start cheap (haiku), escalate on failure (sonnet, then opus)

## Phase 0: Pre-Execute

### 1. Prepare Environment

    # Install dependencies if needed
    npm install  # or appropriate command from .beastmode/context/

## Phase 1: Execute

### Escalation State

The controller maintains per-task escalation state:

- **Model ladder:** `["haiku", "sonnet", "opus"]`
- **Current tier index:** starts at 0 (haiku) for each new task
- **Tier retry counter:** starts at 0 for each new task, resets on escalation

When a task begins, reset both to zero. The tier index selects the model passed to the Agent tool's `model` parameter for implementer dispatch. Reviewer agents (spec-reviewer, quality-reviewer) do not receive a model parameter — they use the default model.

The following statuses do NOT trigger model escalation:
- **NEEDS_CONTEXT** — a context problem, not a model capability limitation. Provide context and re-dispatch at the same tier.
- **Spec review FAIL** — a requirement misunderstanding, not a model capability limitation. Re-dispatch implementer at the same tier.
- **Quality review NOT_APPROVED with only Minor issues** — treated as approved. No retry needed.

### BDD Verification Escalation

The controller also maintains a separate BDD verification escalation state, used during the post-implementation integration test retry loop (see Phase 1, Step 4):

- **Model ladder:** `["haiku", "sonnet", "opus"]` (same ladder)
- **Budget:** 6 total retries (2 per tier)
- **Independence:** BDD verification escalation is fully independent from per-task escalation. A task that completed at haiku during initial dispatch may be re-dispatched at sonnet during BDD verification if the integration test keeps failing.

The BDD verification escalation resets to tier 0 (haiku) when a new BDD retry loop begins. It does NOT carry over from per-task escalation.

### 0. Write Plan

Before dispatching, produce a detailed `.tasks.md` document from the feature plan. This is the inspection point between "plan says what to build" and "agent writes code."

1. **Read feature plan** — user stories, what to build, acceptance criteria (available in conversation context via hook injection)
2. **Read architectural decisions** from the design doc (available in conversation context via hook injection) — these are constraints
3. **Explore codebase** — identify exact files, patterns, test structure, dependencies
4. **Generate Task 0** — the integration test:
   - Read the feature plan's `## Integration Test Scenarios` section — extract the Gherkin scenarios
   - If the section exists, create Task 0 as the first task:
     - Task 0 creates a runnable integration test file from the Gherkin scenarios
     - The test must be runnable in isolation (feature-scoped, no cross-feature dependencies)
     - The test uses the project's existing test runner with naming convention for identification (e.g., `<feature-name>.integration.test.ts` or `<feature-name>.feature`)
     - The test is expected to FAIL after Task 0 (RED state) — the feature isn't implemented yet
     - Task 0 is always Wave 0 with no dependencies
   - If the section does not exist, skip Task 0 — proceed with tasks starting at Task 1
   - All implementation tasks start at Task 1 — Task 0 is reserved for the integration test
5. **Create implementation tasks** using the Task Format (see Reference section):
   - Map each aspect of "What to Build" to one or more tasks
   - Include exact file paths discovered from codebase exploration
   - Include complete code in steps — no placeholders
   - Assign wave numbers based on dependencies (minimum Wave 1 — Wave 0 is reserved for Task 0)
   - Include verification steps with expected output
6. **Write `.tasks.md`** to `.beastmode/artifacts/implement/YYYY-MM-DD-<epic-name>-<feature-name>.tasks.md`:

   The document has three sections and NO YAML frontmatter (the stop hook scans `artifacts/<phase>/` for `.md` files with frontmatter and generates `.output.json` — the `.tasks.md` must not trigger this):

   **Header section** — goal, architecture, tech stack, duplicated from the feature plan (not referenced). Makes the document self-contained for agents.

   **File Structure section** — every file to be created or modified with its responsibility. Decomposition decisions are locked here, before individual task definitions.

   **Task definitions** — bite-sized TDD tasks following the Task Format (see Reference section). Each task uses checkbox tracking for cross-session resume:

   ```markdown
   - [ ] **Step 1: Write the failing test**
   [complete test code]

   - [ ] **Step 2: Run test to verify it fails**
   Run: `[exact command]`
   Expected: FAIL with "[message]"
   ```

   The controller resumes from the first unchecked step (`- [ ]`).

7. **Self-review pass** — before proceeding to dispatch, verify the `.tasks.md`:
   - **Spec coverage**: every acceptance criterion from the feature plan maps to at least one task
   - **Placeholder scan**: grep for TBD, TODO, "add appropriate", "similar to Task N", ellipsis (`...`) in code blocks — these are plan failures
   - **Type/name consistency**: identifiers used across tasks are consistent (no typos, no renamed-but-not-updated references)
   - **Task 0 presence**: if the feature plan has `## Integration Test Scenarios`, verify Task 0 exists and produces a runnable test
   - Fix violations inline — no approval gate

### 1. Parse Waves

Extract wave numbers and dependencies from the `.tasks.md`:

1. For each task, extract `**Wave:**` and `**Depends on:**` fields
2. Group tasks by wave number (default wave = 1 if omitted)
3. Within each wave, build dependency order from `Depends on` field

### 2. Wave Loop

For each wave (ascending order):

1. **Identify Runnable Tasks** — From the wave map, select tasks where:
   - Task belongs to current wave
   - All dependencies are completed (or no dependencies)
   - Task is not already completed (all checkboxes `- [x]` in .tasks.md)

2. **Dispatch and Review** — Sequential dispatch only. For each runnable task in the wave:

   #### A. Pre-Read

   Read the task's **Files** section — pre-read the listed files so the agent has context.

   #### B. Dispatch Implementer

   1. Build the implementer prompt:
      - Append: full task text (all steps, files, verification)
      - Append: pre-read file contents
      - Append: project conventions from `.beastmode/context/IMPLEMENT.md`
   2. Spawn: `Agent(subagent_type="beastmode:implement-dev", model=<current tier from escalation state>, prompt=<built prompt>)`
   3. Collect the agent's status report

   #### C. Handle Implementer Status

   Process the implementer's reported status:

   - **DONE**: proceed to spec review (step D)
   - **DONE_WITH_CONCERNS**: read the concerns.
     - If correctness or scope issue: re-dispatch implementer with specific fix instructions (max 2 retries, then BLOCKED)
     - If observation only: note the concern in the deviation log and proceed to spec review (step D)
   - **NEEDS_CONTEXT**: provide the missing context and re-dispatch the same task to a new implementer agent. Max 2 retries. After max retries: mark task as blocked, report to user.
   - **BLOCKED**: assess the blocker and attempt re-dispatch with context or a smaller split. Track retries against the current tier's budget (2 retries per tier).
     - If retries at current tier < 2: re-dispatch with context or split at the same model tier.
     - If retries at current tier exhausted (2 attempts) and a higher tier exists: **escalate** — increment the tier index, reset the tier retry counter to 0, re-dispatch at the new model tier.
     - If retries exhausted at opus (top tier): mark task as BLOCKED, report to user. Maximum 6 total attempts reached.

   Never ignore an escalation or force retry without changes.

   #### D. Spec Compliance Review

   After implementer reports DONE (or DONE_WITH_CONCERNS with observation-only concerns):

   1. Build the spec-reviewer prompt:
      - Append: the task requirements (from .tasks.md)
      - Append: the implementer's status report
      - Append: the task's file list
   2. Spawn: `Agent(subagent_type="beastmode:implement-qa", prompt=<built prompt>)`
   3. Collect the reviewer's verdict

   **If PASS**: proceed to quality review (step E)

   **If FAIL**: re-dispatch implementer to fix the issues.
   - Provide the spec-reviewer's issue list as context
   - After fix: re-dispatch spec-reviewer
   - Max 2 review cycles. After max: mark task as blocked, report to user

   #### E. Code Quality Review

   After spec compliance passes:

   1. Build the quality-reviewer prompt:
      - Append: the task requirements (for context)
      - Append: the implementer's status report
      - Append: the task's file list
   2. Spawn: `Agent(subagent_type="beastmode:implement-auditor", prompt=<built prompt>)`
   3. Collect the reviewer's verdict

   **If APPROVED**: mark task as complete, proceed to next task

   **If NOT_APPROVED with Critical or Important issues**: re-dispatch implementer to fix.
   - Provide the quality-reviewer's issue list as context
   - After fix: re-dispatch quality-reviewer
   - Max 2 review-fix cycles at the current model tier. After exhausting cycles:
     - If a higher tier exists: **escalate** — increment the tier index, reset the tier retry counter to 0, re-dispatch implementer at the new model tier, then re-run the full review pipeline (spec compliance + quality)
     - If at opus (top tier): mark task as BLOCKED, report to user. Maximum quality review escalation reached.

   **If NOT_APPROVED with only Minor issues**: treat as approved — minor issues don't block.

3. **Update Task Persistence** — After each task completes (or is blocked):

   1. Update `.beastmode/artifacts/implement/YYYY-MM-DD-<epic-name>-<feature-name>.tasks.md`:
      - Toggle completed steps from `- [ ]` to `- [x]`
      - If task is blocked, add `**Status: BLOCKED**` after the task header

4. **Wave Checkpoint** — After ALL tasks in the current wave complete:

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

### 4. Feature-Level BDD Verification

After all waves complete (and before reporting completion), run the feature's integration test if Task 0 was dispatched.

#### A. Locate Integration Test

Find the integration test created by Task 0 using convention-based discovery:

1. **File naming:** Look for `<feature-name>.integration.test.ts` or `<feature-name>.feature` in the project's test directories
2. **Tags:** Look for `@<epic-name>` tag on Gherkin features
3. **Describe blocks:** Look for the feature name in describe/feature blocks

If no integration test is found (Task 0 was skipped because the feature plan had no Gherkin section), skip BDD verification entirely and proceed to Completion.

#### B. Run Integration Test

Execute the integration test in isolation using the project's test runner with the specific test file or tag filter.

#### C. Handle Result

**If GREEN (pass):** Feature satisfies its acceptance criteria. Proceed to Completion.

**If RED (fail):** Enter the BDD retry loop.

#### D. BDD Retry Loop

The BDD retry loop uses an independent escalation state (separate from per-task escalation):

- **Model ladder:** `["haiku", "sonnet", "opus"]`
- **Budget:** 6 total retries (2 per tier)
- **Tier index:** starts at 0 (haiku)
- **Tier retry counter:** starts at 0, resets on escalation

For each retry:

1. **Analyze failure** — examine test assertions, stack traces, and error messages from the integration test output
2. **Identify responsible task** — map the failure to the most likely task based on:
   - Which task's files are referenced in the failure
   - Which task's acceptance criteria align with the failing assertion
   - Which task's implementation area covers the failing behavior
3. **Re-dispatch the responsible task** — build a new implementer prompt:
   - Append: original task instructions (from .tasks.md)
   - Append: integration test failure output
   - Append: failing test assertion details
   - Append: pre-read file contents for the task's files
   - Spawn: `Agent(subagent_type="beastmode:implement-dev", model=<current BDD tier>, prompt=<built prompt>)`
4. **Run the re-dispatched task through the review pipeline** (spec compliance + quality review)
5. **Re-run the integration test**

**After re-run:**
- **GREEN:** Stop retrying. Feature is done. Proceed to Completion.
- **RED:** Increment the BDD retry counter.
  - If retries at current tier < 2: retry at the same model tier (go to step 1)
  - If retries at current tier exhausted (2 attempts) and a higher tier exists: escalate — increment the BDD tier index, reset the BDD tier retry counter to 0, retry at the new tier (go to step 1)
  - If retries exhausted at opus (top tier): mark feature as failed. Report to user:
    ```
    BDD verification failed after 6 retries (2x haiku, 2x sonnet, 2x opus).
    Last failure: [test name] — [assertion message]
    Responsible task: Task N — [description]
    ```
    Proceed to Completion with failure status.

### 5. Completion

When all waves complete and BDD verification passes (or is skipped):
- Report: "Implementation complete. N tasks done, M review cycles. BDD verification: [passed | failed after K retries | skipped]."
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

### 6. Status Summary

Print the accumulated status log from the execute phase:

    ### Status Summary

    Tasks: N completed, M blocked
    Review cycles: N (spec: X, quality: Y)

    Concerns noted:
    - Task 3: File growing beyond plan's intent
    - Task 5: Naming uncertainty on helper function

    Blocked tasks:
    - Task 7: [blocker description]

    Total: N tasks, M review cycles, K concerns

    Escalations: N tasks escalated (X to sonnet, Y to opus)

    BDD verification: [passed | passed after K retries | failed after K retries | skipped]
    BDD retries: K total (X× haiku, Y× sonnet, Z× opus)

Omit the Escalations line if no tasks escalated.
Omit the BDD retries line if BDD verification passed on first run or was skipped.

If all tasks completed with no concerns: "All tasks completed cleanly — no concerns or blockers."

### 7. Validation Failure Handling

If any check still fails after fix loop:
- Report failures with full context

Attempt additional investigation and targeted fixes. After exhausting options, log the failures and proceed to checkpoint with a warning.
Do NOT proceed to next phase if critical tests fail.

## Phase 3: Checkpoint

### 1. Save Implementation Report

Save to `.beastmode/artifacts/implement/YYYY-MM-DD-<epic-name>-<feature-name>.md`:

IMPORTANT: The filename MUST be exactly `YYYY-MM-DD-<epic-name>-<feature-name>.md` — no
extra suffixes like `-deviations`. The stop hook derives the output.json filename from
this basename, and the watch loop matches on `-<epic>-<feature>.output.json`. Any extra
suffix breaks the match and the watch loop never sees completion.

    # Implementation Report: <feature-name>

    **Date:** YYYY-MM-DD
    **Feature Plan:** .beastmode/artifacts/plan/YYYY-MM-DD-<epic-name>-<feature-name>.md
    **Tasks completed:** N/M
    **Review cycles:** N (spec: X, quality: Y)
    **Concerns:** N
    **BDD verification:** [passed | passed after K retries | failed after K retries | skipped]

    ## Completed Tasks
    - Task N: <description> (<model tier>) — [clean | with concerns | escalated from <prior tier>: <reason>]

    ## Concerns
    - Task N: <description>

    ## Blocked Tasks
    - Task N: <blocker description>

    ## BDD Verification
    - Result: [passed | passed after K retries | failed after K retries | skipped]
    - Retries: N (haiku: X, sonnet: Y, opus: Z)
    - Last failure: [test name — assertion message] (if applicable)
    - Responsible task: Task N (if retries occurred)

If BDD verification passed on first run: "BDD verification passed — integration test GREEN after all tasks completed."
If skipped: "BDD verification skipped — no Integration Test Scenarios in feature plan."

If all tasks completed with no concerns, still write this file with "Concerns: 0" and empty sections.
This file MUST always be written — the stop hook reads its frontmatter to generate
output.json, which the watch loop uses to detect completion.

The artifact MUST begin with YAML frontmatter:

```yaml
---
phase: implement
epic-id: <epic-id>
epic-slug: <epic-name>
feature-id: <feature-id>
feature-slug: <feature-name>
status: completed
---
```

Set `status` to `completed` if all tasks passed, `error` if any task is blocked.

### 2. Commit and Handoff

Commit the implementation report on the feature branch:

```bash
git add .beastmode/artifacts/implement/
git commit -m "implement(<epic-name>-<feature-name>): checkpoint"
```

Print:

```
Next: beastmode validate <epic-name>
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
- Agents commit per task on the feature branch using `git add <files>` + `git commit` — never push or switch branches
- Agents must NOT read the plan file — controller provides task text
- Agents must NOT modify files outside their task's file list
- If an agent returns BLOCKED, controller assesses and either re-dispatches or escalates to user

### Status Handling

- DONE and DONE_WITH_CONCERNS: proceed through review pipeline
- NEEDS_CONTEXT: controller provides context and re-dispatches
- BLOCKED: controller assesses and either fixes, splits, or escalates
- All statuses tracked in implementation report for checkpoint
- See Agent Statuses in Reference section for full descriptions

## Reference

### Agent Statuses

Four statuses replace the three-tier deviation system.

### DONE

Agent completed all steps. Tests pass. Code is clean.
**Controller action:** Proceed to spec compliance review.

### DONE_WITH_CONCERNS

Agent completed all steps but flagged something for attention.
**Controller action:** Read concerns. If correctness/scope → address before review. If observation → note and proceed to review.

Typical concerns: file growing beyond plan's intent, naming uncertainty, potential edge case, design tension.

### NEEDS_CONTEXT

Agent cannot proceed without information not provided in the task.
**Controller action:** Provide the missing context and re-dispatch. Max 2 retries.

### BLOCKED

Agent hit an obstacle it cannot resolve.
**Controller action:** Assess the blocker. Options:
1. Provide more context and re-dispatch
2. Break task into smaller pieces
3. Escalate to user (plan itself may be wrong)

Never force retry without changes.

### Review Pipeline

Two-stage ordered review after each task:

1. **Spec compliance** (`beastmode:implement-qa`) — verifies implementation matches requirements by reading actual code
2. **Code quality** (`beastmode:implement-auditor`) — evaluates code quality after spec compliance confirmed

Review retry loop:
- Reviewer finds issues → implementer fixes → reviewer re-reviews
- Max 2 cycles per review stage
- After max: mark task as blocked, report to user

### Implementation Report Format

Accumulated during execution, saved at checkpoint:

    ## Completed Tasks
    - Task 0: Implementer agent (haiku) — clean
    - Task 1: Implementer agent (sonnet) — clean (escalated from haiku: BLOCKED)
    - Task 3: Implementer agent (opus) — with concerns (escalated from sonnet: quality NOT_APPROVED)

    ## Concerns
    - Task 3: SKILL.md grew significantly during controller rewrite

    ## Blocked Tasks
    None

    **Summary:** 4 tasks completed (1 with concerns), 0 blocked, 6 review cycles, 2 escalations

    ## BDD Verification
    - Result: passed after 3 retries
    - Retries: 3 (haiku: 2, sonnet: 1, opus: 0)
    - Last failure: auth-flow.integration.test.ts — "Expected token to be valid"
    - Responsible task: Task 3

If no concerns or blocks: "All tasks completed cleanly — no concerns or blockers."

### Task Format

> Used by /implement's Write Plan step to create the `.tasks.md` document from feature plans.

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

**Step 5: Commit**

```bash
git add [specific files]
git commit -m "feat(<feature>): [specific message]"
```
```

### Wave Rules

- **Wave 1** runs before **Wave 2**, etc.
- Tasks in the same wave with no `Depends on` can run in parallel — if the wave is marked parallel-safe
- `Depends on` creates ordering within a wave
- Default wave is 1 if omitted

**Parallel-Safe Flag** — After all tasks are written, /implement's Write Plan step analyzes file overlap per wave and may add:

```
**Parallel-safe:** true
```

to the first task in a wave. This flag means no two tasks in the wave share a file, so dispatch can run agents in parallel.

- Written by the Write Plan step — not by the human planner
- If two tasks in a wave share a file, auto-resequence the later task to Wave N+1
- Single-task waves are not flagged (nothing to parallelize)
- Verify the flag at runtime before parallel dispatch

### Remember

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant docs/designs with links
- DRY, YAGNI, TDD (commits at /release only)
