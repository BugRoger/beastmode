---
name: implement
description: Execute implementation plans — implementing, coding, building. Use after plan. Dispatches subagent per task with wave ordering, deviation handling, and spec checks.
---

# /implement

Load plan, dispatch subagents per task in wave order, verify completion.

## Guiding Principles

- **No Plan Mode** — this skill operates in normal mode. EnterPlanMode/ExitPlanMode restrict Write/Edit tools and break the workflow.
- **Session metadata is the source of truth** — the session-start hook injects a metadata block with `epic-id`, `epic-slug`, `feature-id`, `feature-name`, `feature-slug`, parent artifacts, and `output-target`. Use these values verbatim — do NOT re-derive, re-extract, or generate alternatives.
- **Wave ordering drives sequencing** — foundation before consumers; parallel-safe waves dispatch all tasks concurrently; reviews run sequentially after all implementations complete
- **Model escalation** — start cheap (haiku), escalate on failure (sonnet, then opus). See Reference > Model Escalation.
- **Working directory isolation** — `/implement` always creates a dedicated git worktree so the main repo stays clean on its current branch and multiple features can run in parallel. The worktree persists until `/release` completes the squash-merge.
- **Subagent safety** — one agent per task; parallel-safe waves dispatch all tasks simultaneously, non-parallel-safe waves dispatch sequentially; agents commit per task via `git add <files>` + `git commit`; agents must NOT read the plan file, modify files outside their task's file list, or push/switch branches

## Phase 0: Worktree Setup

Before dispatching the taskplanner, ensure work happens in an isolated worktree.

### 0a. Check for existing worktree

```bash
git worktree list
```

If `.claude/worktrees/<epic-slug>` already appears (interrupted prior session), use `EnterWorktree` with `path: ".claude/worktrees/<epic-slug>"` to re-enter it, then skip to Phase 1.

### 0b. Create worktree (first run)

```bash
git worktree add .claude/worktrees/<epic-slug> -b feat/<epic-slug>
```

Then use `EnterWorktree` with `path: ".claude/worktrees/<epic-slug>"` to switch the session into it.

All subsequent work (taskplanner, implementers, reviewers, commits, tests) runs inside this worktree. The main repo working directory is never touched.

## Phase 1: Execute

Dispatch taskplanner, loop over waves dispatching implementers and reviewers.

### 1. Dispatch Taskplanner

Spawn the taskplanner agent to produce the `.tasks.md`:

1. Build the prompt — see Reference > Agent Dispatch Templates > Taskplanner
2. Spawn: `Agent(subagent_type="beastmode:implement-taskplanner", model="opus", prompt=<built prompt>)`

### 2. Parse Waves

Extract wave numbers and dependencies from the `.tasks.md`:

1. For each task, extract `**Wave:**` and `**Depends on:**` fields
2. Group tasks by wave number (default wave = 1 if omitted)
3. Within each wave, build dependency order from `Depends on` field

### 3. Wave Loop

For each wave (ascending order):

#### 3a. Identify Runnable Tasks

From the wave map, select tasks where:
- Task belongs to current wave
- All dependencies are completed (or no dependencies)
- Task is not already completed (all checkboxes `- [x]` in .tasks.md)

#### 3b. Dispatch Implementers

1. **Determine mode:** Parallel if wave has `**Parallel-safe:** true` on its first task AND 2+ runnable tasks. Otherwise sequential.
2. **Spawn** one `beastmode:implement-dev` agent per task at the current model tier. Pass the task's file list for the agent to read. See Reference > Agent Dispatch Templates > Implementer.
   - **Parallel mode:** all agents in a single message (parallel tool calls).
   - **Sequential mode:** one agent at a time; run steps 3c–3d after each before dispatching the next.
3. **Collect** all agent status reports.

#### 3c. Handle Status

Process each implementer's reported status:

| Status | Action |
|---|---|
| **DONE** | Proceed to review pipeline (3d) |
| **DONE_WITH_CONCERNS** | Correctness/scope issue → re-dispatch with fix instructions (max 2 retries). Observation only → note concern, proceed to 3d |
| **NEEDS_CONTEXT** | Provide missing context, re-dispatch same task (max 2 retries). After max → BLOCKED |
| **BLOCKED** | Re-dispatch with context or smaller split. Track retries against current tier budget (2 per tier). Escalate on tier exhaustion — see Reference > Model Escalation |

Never force retry without changes.

#### 3d. Review Pipeline

Two-stage ordered review after implementer reports DONE (or observation-only concerns):

1. **Spec compliance** — spawn `beastmode:implement-qa`. See Reference > Agent Dispatch Templates > Spec Reviewer.
   - **PASS:** proceed to quality review.
   - **FAIL:** re-dispatch implementer with reviewer's issue list, re-run spec review. Max 2 cycles. After max → BLOCKED.

2. **Code quality** — spawn `beastmode:implement-auditor`. See Reference > Agent Dispatch Templates > Quality Reviewer.
   - **APPROVED:** task complete.
   - **NOT_APPROVED (Critical/Important):** re-dispatch implementer with issue list, re-run quality review. Max 2 cycles at current tier. After max → escalate model tier, re-run full pipeline (spec + quality). See Reference > Model Escalation.
   - **NOT_APPROVED (Minor only):** treat as approved — minor issues don't block.

#### 3e. Update Persistence

After each task completes (or is blocked):

1. Update `.beastmode/artifacts/implement/YYYY-MM-DD-<epic-slug>--<feature-slug>.tasks.md`:
   - Toggle completed steps from `- [ ]` to `- [x]`
   - If task is blocked, add `**Status: BLOCKED**` after the task header

#### 3f. Wave Checkpoint

After ALL tasks in the current wave complete:

1. Run the project test suite (command from `.beastmode/context/implement/testing.md`)
2. If tests fail: identify likely responsible task, re-dispatch with failure context. After 2 retries → mark wave blocked, report to user.
3. If tests pass: proceed to next wave.

If a blocked task has dependents in later waves, report: "Task N is blocked. Tasks [X, Y] in Wave M depend on it." Investigate if resolvable; otherwise skip dependents and log.

### 4. Completion

When all waves complete:
- Report: "Implementation complete. N tasks done, M review cycles."
- Proceed to validate phase.

## Phase 2: Validate

BDD verification first (the feature-level acceptance gate), then quality checks.

### 1. BDD Verification Loop

If Task 0 was dispatched during Execute, run the feature's integration test. If no Task 0 → skip to step 2.

#### 1a. Locate Integration Test

Find the integration test created by Task 0:

1. **File naming:** `<feature-slug>.integration.test.ts` or `<feature-slug>.feature` in test directories
2. **Tags:** `@<epic-slug>` tag on Gherkin features
3. **Describe blocks:** feature name in describe/feature blocks

If not found → skip BDD verification, proceed to step 2.

#### 1b. Run and Retry

1. Run the integration test in isolation.
2. **GREEN:** BDD verification passed. Proceed to step 2.
3. **RED:** Enter retry loop (budget: 6 retries, 2 per tier — see Reference > BDD Verification Escalation):
   - Analyze failure — examine assertions, stack traces, error messages
   - Identify responsible task — map failure to task by file references, acceptance criteria, behavior area
   - Re-dispatch responsible task through implementer (3b) + review pipeline (3d)
   - Re-run integration test
   - **GREEN:** stop, proceed to step 2
   - **RED:** increment retry counter, escalate tier if budget exhausted at current tier
4. All retries exhausted → mark feature failed, report:
   ```
   BDD verification failed after 6 retries (2x haiku, 2x sonnet, 2x opus).
   Last failure: [test name] — [assertion message]
   Responsible task: Task N — [description]
   ```

### 2. Run Tests

    # Run project test command (from .beastmode/context/implement/testing.md)
    npm test  # or appropriate command

Capture output and exit code.

### 3. Run Build (if applicable)

    npm run build  # or appropriate command

### 4. Run Lint (if applicable)

    npm run lint  # or appropriate command

### 5. Fix Loop

If any check fails:
1. Analyze the failure — identify root cause
2. Attempt a targeted fix (scope to the failing area)
3. Re-run the failing check
4. If fixed: continue to next check
5. If still failing after 2 attempts: report to user with actionable detail

Do NOT just "stop and report" on first failure. Attempt a fix first.

If any check still fails after fix loop: attempt additional investigation and targeted fixes. After exhausting options, log failures and proceed to checkpoint with a warning. Do NOT proceed to next phase if critical tests fail.

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

## Phase 3: Checkpoint

### 1. Save Implementation Report

Save to the path specified by `output-target` in the session metadata block.

IMPORTANT: The filename MUST match the `output-target` exactly — no
extra suffixes like `-deviations`. The stop hook derives the output.json filename from
this basename, and the watch loop matches on the epic/feature slug convention. Any extra
suffix breaks the match and the watch loop never sees completion.

The artifact MUST begin with YAML frontmatter:

```yaml
---
phase: implement
epic-id: <epic-id>
epic-slug: <epic-slug>
feature-id: <feature-id>
feature-name: <feature-name>
feature-slug: <feature-slug>
status: completed
---
```

Set `status` to `completed` if all tasks passed, `error` if any task is blocked.

Report body:

    # Implementation Report: <feature-name>

    **Date:** YYYY-MM-DD
    **Feature Plan:** .beastmode/artifacts/plan/YYYY-MM-DD-<epic-slug>--<feature-slug>.md
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

### 2. Commit and Handoff

Commit the implementation report on the feature branch:

```bash
git add .beastmode/artifacts/implement/
git commit -m "implement(<epic-slug>--<feature-slug>): checkpoint"
```

Print:

```
Next: beastmode validate <epic-slug>
```

STOP. No additional output.

## Reference

### Model Escalation

The controller maintains per-task escalation state:

- **Model ladder:** `["haiku", "sonnet", "opus"]`
- **Current tier index:** starts at 0 (haiku) for each new task
- **Tier retry counter:** starts at 0 for each new task, resets on escalation

When a task begins, reset both to zero. The tier index selects the model passed to the Agent tool's `model` parameter for implementer dispatch. Reviewer agents (spec-reviewer, quality-reviewer) do not receive a model parameter — they use the default model.

**Escalation triggers:**
- Implementer BLOCKED after 2 retries at current tier → escalate
- Quality review NOT_APPROVED (Critical/Important) after 2 review-fix cycles at current tier → escalate

**Non-triggers (no escalation):**
- NEEDS_CONTEXT — context problem, not model capability. Re-dispatch at same tier.
- Spec review FAIL — requirement misunderstanding. Re-dispatch at same tier.
- Quality review NOT_APPROVED with only Minor issues — treated as approved.

**Budget:** 2 retries per tier × 3 tiers = 6 total attempts. After opus exhausted → BLOCKED.

### BDD Verification Escalation

The BDD verification loop uses an independent escalation state, separate from per-task escalation:

- **Model ladder:** `["haiku", "sonnet", "opus"]` (same ladder)
- **Budget:** 6 total retries (2 per tier)
- **Independence:** A task that completed at haiku during initial dispatch may be re-dispatched at sonnet during BDD verification if the integration test keeps failing.
- **Reset:** BDD escalation resets to tier 0 (haiku) when the BDD retry loop begins. Does NOT carry over from per-task escalation.

### Agent Dispatch Templates

#### Taskplanner

Build the prompt:
- Append: feature plan text (from conversation context — hook-injected)
- Append: epic-slug, feature-slug (from session metadata)
- Append: output path — `.beastmode/artifacts/implement/YYYY-MM-DD-<epic-slug>--<feature-slug>.tasks.md`

Spawn: `Agent(subagent_type="beastmode:implement-taskplanner", model="opus", prompt=<built prompt>)`

#### Implementer

Build the prompt:
- Append: full task text (all steps, files, verification)
- Append: project conventions from `.beastmode/context/IMPLEMENT.md`

Spawn: `Agent(subagent_type="beastmode:implement-dev", model=<current tier from escalation state>, prompt=<built prompt>)`

#### Spec Reviewer

Build the prompt:
- Append: the task requirements (from .tasks.md)
- Append: the implementer's status report
- Append: the task's file list

Spawn: `Agent(subagent_type="beastmode:implement-qa", prompt=<built prompt>)`

#### Quality Reviewer

Build the prompt:
- Append: the task requirements (for context)
- Append: the implementer's status report
- Append: the task's file list

Spawn: `Agent(subagent_type="beastmode:implement-auditor", prompt=<built prompt>)`

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
