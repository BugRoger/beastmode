# 1. Execute

## 0. Decompose Feature into Tasks

Before dispatching, create a detailed task breakdown from the architectural feature plan.

1. **Read feature plan** — user stories, what to build, acceptance criteria
2. **Read architectural decisions** from the design doc — these are constraints
3. **Explore codebase** — identify exact files, patterns, test structure, dependencies
4. **Create tasks** using the format in [task-format.md](../references/task-format.md):
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

## 1. Parse Waves

Extract wave numbers and dependencies from the tasks created in Decompose:

1. For each task, extract `**Wave:**` and `**Depends on:**` fields
2. Group tasks by wave number (default wave = 1 if omitted)
3. Within each wave, build dependency order from `Depends on` field

## 2. Wave Loop

For each wave (ascending order):

### 2.1 Identify Runnable Tasks

From the wave map, select tasks where:
- Task belongs to current wave
- All dependencies are completed (or no dependencies)
- Task is not already completed (from .tasks.json resume)

### 2.2 Dispatch Subagents

Check the wave's `**Parallel-safe:**` flag (appears after the first task's `**Wave:**` line).

**If Parallel-safe: true** — verify and dispatch in parallel:

1. Verify: collect all file paths from all tasks in this wave and confirm no file appears in 2+ tasks
2. If verification passes:
   - For each task: build the agent prompt (same as sequential — see below)
   - Spawn all agents with `Agent(subagent_type="general-purpose", prompt=<built prompt>, run_in_background=true)`
   - Collect all results via `TaskOutput(task_id=<agent_id>, block=true)`
   - Run spec check (2.3) on each result in order
3. If verification fails:
   - Log: `[Blocking] Wave N: parallel-safe flag incorrect, falling back to sequential`
   - Fall through to sequential dispatch below

**If no flag or Parallel-safe: false** — dispatch sequentially (default):

For each runnable task in the wave:

1. Read the task's **Files** section — pre-read the listed files
2. Build the agent prompt:
   - Read `@../../agents/implement-implementer.md` for the agent role
   - Append: full task text (all steps, files, verification)
   - Append: pre-read file contents
   - Append: project conventions from `.beastmode/context/IMPLEMENT.md`
3. Spawn: `Agent(subagent_type="general-purpose", prompt=<built prompt>)`
4. Collect the agent's result report
5. Run spec check (2.3) before dispatching next task

### 2.3 Spec Check

After each agent completes, the controller verifies:

1. **Files match plan?** — Check that files listed in the task's `**Files:**` section were actually modified
2. **Verification passes?** — Run the task's verification command if the agent didn't already
3. **No unplanned files?** — Compare `git diff --name-only` against baseline snapshot (from prime step 5) + plan's file list. Only flag files that are NEW since baseline AND not in the current task's file list.

If spec check fails:
- Re-dispatch the same task to a new agent with the failure context
- After 2 retries: mark task as blocked, report to user

### 2.4 Handle Deviations

Process the agent's deviation report per [deviation-rules.md](../references/deviation-rules.md):

- **Auto-fix / Blocking**: Log to deviation tracker, continue

#### 2.4.1 [GATE|implement.architectural-deviation]

Read `.beastmode/config.yaml` → resolve mode for `implement.architectural-deviation`.
Default: `auto`.

##### [GATE-OPTION|human] Ask User

Present to user via AskUserQuestion:
  - "Proceed with proposed change"
  - "Different approach" (user specifies)
  - "Skip this task" (mark blocked)

##### [GATE-OPTION|auto] Claude Decides

Evaluate the deviation and proceed with the proposed change. If clearly safe, continue. If ambiguous, proceed cautiously and log.
Log: "Gate `implement.architectural-deviation` → auto: <decision>"

### 2.5 Update Task Persistence

After each task completes (or is blocked):

1. Update `.beastmode/artifacts/plan/YYYY-MM-DD-<design>-<feature-slug>.tasks.json`:
   - Set task status to `completed` or `blocked`
   - Set `lastUpdated` timestamp
2. Update TodoWrite

### 2.6 Wave Checkpoint

After ALL tasks in the current wave complete:

1. Run the project test suite (command from `.beastmode/context/implement/testing.md`)
2. If tests fail:
   - Identify which task likely caused the regression
   - Re-dispatch that task with failure context
   - After 2 retries: mark wave as blocked, report to user
3. If tests pass: proceed to next wave

## 3. [GATE|implement.blocked-task-decision]

If a task is blocked and has dependents in later waves:
- Report to user: "Task N is blocked. Tasks [X, Y] in Wave M depend on it."

Read `.beastmode/config.yaml` → resolve mode for `implement.blocked-task-decision`.
Default: `auto`.

### [GATE-OPTION|human] Ask User

Ask: "Skip dependent tasks or investigate?"

### [GATE-OPTION|auto] Claude Investigates

Investigate the blocked task. If resolvable, fix and continue. If not, skip dependent tasks and log.
Log: "Gate `implement.blocked-task-decision` → auto: <decision>"

## 4. Completion

When all waves complete:
- Report: "Implementation complete. N tasks done, M deviations tracked."
- Proceed to validate phase.
