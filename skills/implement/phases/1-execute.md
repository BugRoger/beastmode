# 1. Execute

## 1. Wave Loop

For each wave (ascending order):

### 1.1 Identify Runnable Tasks

From the wave map (built in prime), select tasks where:
- Task belongs to current wave
- All dependencies are completed (or no dependencies)
- Task is not already completed (from .tasks.json resume)

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

#### 1.4.1 Gate: implement.architectural-deviation

Read `.beastmode/config.yaml` → check `gates.implement.architectural-deviation`.
Default: `auto`. Execute ONLY the matching option below.

##### human — Ask User

Present to user via AskUserQuestion:
  - "Proceed with proposed change"
  - "Different approach" (user specifies)
  - "Skip this task" (mark blocked)

##### auto — Claude Decides

Evaluate the deviation and proceed with the proposed change. If clearly safe, continue. If ambiguous, proceed cautiously and log.
Log: "Gate `implement.architectural-deviation` → auto: <decision>"

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

## 2. Gate: implement.blocked-task-decision

If a task is blocked and has dependents in later waves:
- Report to user: "Task N is blocked. Tasks [X, Y] in Wave M depend on it."

Read `.beastmode/config.yaml` → check `gates.implement.blocked-task-decision`.
Default: `auto`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 2.1 human — Ask User

Ask: "Skip dependent tasks or investigate?"

### 2.2 auto — Claude Investigates

Investigate the blocked task. If resolvable, fix and continue. If not, skip dependent tasks and log.
Log: "Gate `implement.blocked-task-decision` → auto: <decision>"

## 3. Completion

When all waves complete:
- Report: "Implementation complete. N tasks done, M deviations tracked."
- Proceed to validate phase.
