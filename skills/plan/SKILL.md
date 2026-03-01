---
name: plan
description: "Create implementation plans. Outputs to .agents/plan/."
---

@../_shared/SESSION-TRACKING.md

# /plan

## CRITICAL CONSTRAINTS — Read Before Anything Else

**You MUST NOT call `EnterPlanMode` or `ExitPlanMode` at any point during this skill.** This skill operates in normal mode and manages its own completion flow via `AskUserQuestion`. Calling `EnterPlanMode` traps the session in plan mode where Write/Edit are restricted. Calling `ExitPlanMode` breaks the workflow and skips the user's execution choice. If you feel the urge to call either, STOP — follow this skill's instructions instead.

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the /plan skill to create the implementation plan."

**Save plans to:** `.agents/plan/YYYY-MM-DD-<feature-name>.md`

## REQUIRED FIRST STEP: Initialize Task Tracking

**BEFORE exploring code or writing the plan, you MUST:**

1. Call `TodoWrite` to check for existing tasks from design
2. If tasks exist: you will enhance them with implementation details as you write the plan
3. If no tasks: you will create them with `TodoWrite` as you write each plan task

**Do not proceed to exploration until TodoWrite has been called.**

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Design Doc:** [Link to .agents/design/ doc if applicable]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant docs/designs with links
- DRY, YAGNI, TDD, frequent commits

## Execution Handoff

<HARD-GATE>
STOP. You are about to complete the plan. DO NOT call EnterPlanMode or ExitPlanMode. DO NOT automatically start implementation. You MUST call AskUserQuestion below.
</HARD-GATE>

Your ONLY permitted next action is calling `AskUserQuestion` with this EXACT structure:

```yaml
AskUserQuestion:
  question: "Plan complete and saved to .agents/plan/<filename>.md. Ready to continue with implementation?"
  header: "Next Step"
  options:
    - label: "Yes, continue with /implement"
      description: "I'll run /implement to execute this plan"
    - label: "No, I'll review first"
      description: "End here, I'll invoke /implement manually when ready"
```

**If you are about to call ExitPlanMode, STOP — call AskUserQuestion instead.**

After user responds, print the copy-pasteable command:

```
/implement .agents/plan/YYYY-MM-DD-<feature-name>.md
```

Replace with the actual filename you just created. **Do NOT invoke the skill yourself** — let the user copy-paste it.

---

## Native Task Integration Reference

Use Claude Code's native task tools to create structured tasks alongside the plan document.

### Creating Native Tasks

For each task in the plan, create a corresponding native task:

```yaml
TodoWrite:
  todos:
    - content: "Task N: [Component Name]"
      activeForm: "Implementing [Component Name]"
      status: pending
```

### During Execution

Update task status as work progresses:

```yaml
TodoWrite:
  todos:
    - content: "Task N: [Component Name]"
      activeForm: "Implementing [Component Name]"
      status: in_progress  # when starting
```

### Notes

- Native tasks provide CLI-visible progress tracking
- Plan document remains the permanent record

---

## Task Persistence

At plan completion, write the task persistence file **in the same directory as the plan document**.

If the plan is saved to `.agents/plan/2026-01-15-feature.md`, the tasks file MUST be saved to `.agents/plan/2026-01-15-feature.tasks.json`.

```json
{
  "planPath": ".agents/plan/2026-01-15-feature.md",
  "tasks": [
    {"id": 0, "subject": "Task 0: ...", "status": "pending"},
    {"id": 1, "subject": "Task 1: ...", "status": "pending", "blockedBy": [0]}
  ],
  "lastUpdated": "<timestamp>"
}
```

Both the plan `.md` and `.tasks.json` must be co-located in `.agents/plan/`.

### Resuming Work

Any new session can resume by running:
```
/implement <plan-path>
```

The skill reads the `.tasks.json` file and continues from where it left off.

---

## Session Status Tracking

**On completion (after writing plan doc and committing):**

1. Extract feature name from plan doc filename (e.g., `2026-03-01-session-tracking.md` → `session-tracking`)
2. Extract date from plan doc filename
3. Get session path using `get_session_path()` with a unique part of your initial arguments
4. Update `.agents/status/YYYY-MM-DD-<feature>.md`
5. Add entry to "Executed Phases" list
6. Append Plan phase section with Summary/Decisions/Issues

## Context Report

@../_shared/CONTEXT-REPORT.md
