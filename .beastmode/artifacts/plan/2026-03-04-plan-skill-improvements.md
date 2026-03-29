# Plan Skill Improvements — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Fix structural duplication in the /plan skill and add task dependency model, design coverage verification, and structured skill handoff.

**Architecture:** Edit 4 existing markdown files in `skills/plan/`. Remove duplicate steps across 0-prime and 1-execute, extend task-format.md with wave/dependency fields, enhance 2-validate with coverage table.

**Tech Stack:** Markdown (skill definitions)

**Design Doc:** `.beastmode/state/design/2026-03-04-plan-skill-improvements.md`

---

## Task 1: Fix 0-prime.md — Remove Explore Codebase step

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/phases/0-prime.md:48-55`

**Step 1: Remove the "Explore Codebase" section**

Delete the entire `## 6. Explore Codebase` section (lines 48-55). Prime should end at "Enter Feature Worktree" — exploration belongs in 1-execute.

The file should end after the worktree step:

```markdown
## 5. Enter Feature Worktree

**MANDATORY — do not skip this step.**

Read the worktree path from the feature name and `cd` into it:

\```bash
feature="<feature-name>"  # from design doc filename
worktree_path=".beastmode/worktrees/$feature"
if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi
cd "$worktree_path"
pwd  # confirm you are in the worktree
\```

If the worktree directory doesn't exist, STOP and tell the user — do not continue on main.

See @../_shared/worktree-manager.md for full reference.
```

**Step 2: Verify**

Confirm 0-prime.md has exactly 5 steps: Announce, Load Context, Research Trigger, Read Design, Enter Worktree. No "Explore" step.

---

## Task 2: Fix 1-execute.md — Remove duplicate worktree entry, add skill routing

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/phases/1-execute.md:1-78`

**Step 1: Replace the entire file**

Remove the stale "Enter Feature Worktree" step 1 (references `.agents/status/` — a path that no longer exists). Exploration becomes step 1. Add skill routing directive to the plan header template. Renumber steps.

New content:

```markdown
# 1. Execute

## 1. Explore Codebase

Understand:
- Existing patterns and conventions
- Files that will be touched
- Test structure and commands
- Dependencies and build tools

## 2. Create Plan Header

\```markdown
# [Feature Name] Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Design Doc:** [Link to .beastmode/state/design/ doc]

---
\```

## 3. Write Tasks

For each component in the design, create a task using the format in @../references/task-format.md.

## 4. Task Guidelines

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant docs/designs with links
- DRY, YAGNI principles
```

**Step 2: Verify**

Confirm 1-execute.md has 4 steps: Explore, Create Header, Write Tasks, Task Guidelines. No worktree entry step. Header template includes `> **For Claude:** Use /implement` directive.

---

## Task 3: Extend task-format.md — Add wave/dependency fields

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/references/task-format.md:1-60`

**Step 1: Replace the entire file**

Add `Wave` and `Depends on` fields to the task structure template. Add a "Wave Rules" section.

New content:

```markdown
# Task Format Reference

## Bite-Sized Granularity

Each step is one action (2-5 minutes):
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step

## Task Structure

\```markdown
### Task N: [Component Name]

**Wave:** [integer, default 1]
**Depends on:** [Task references, or `-` if none]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

\\\`\\\`\\\`python
def test_specific_behavior():
    result = function(input)
    assert result == expected
\\\`\\\`\\\`

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

\\\`\\\`\\\`python
def function(input):
    return expected
\\\`\\\`\\\`

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Verify**

Run all related tests to confirm nothing broke.
No commit needed — unified commit at /release.
\```

## Wave Rules

- **Wave 1** runs before **Wave 2**, etc.
- Tasks in the same wave with no `Depends on` can run in parallel
- `Depends on` creates ordering within a wave
- Default wave is 1 if omitted

## Remember

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant docs/designs with links
- DRY, YAGNI, TDD (commits at /release only)
```

**Step 2: Verify**

Confirm task-format.md includes Wave field, Depends on field, and a "Wave Rules" section.

---

## Task 4: Enhance 2-validate.md — Add design coverage table

**Wave:** 2
**Depends on:** Task 1, Task 2, Task 3

**Files:**
- Modify: `skills/plan/phases/2-validate.md:1-25`

**Step 1: Replace the entire file**

Replace the manual checklist with a design coverage verification table and a completeness check that includes wave/depends fields.

New content:

```markdown
# 2. Validate

## 1. Design Coverage Check

Extract all components from the design doc's `## Components` or `## Key Decisions` sections. For each, verify it appears in at least one plan task.

Print a coverage table:

\```
Design Component          → Plan Task    Status
─────────────────────────────────────────────────
0-prime.md changes        → Task 1       ✓
1-execute.md changes      → Task 2       ✓
2-validate.md changes     → Task 4       ✓
task-format.md changes    → Task 3       ✓
\```

If any component shows `✗ MISSING`, go back to Execute phase and add the missing task.

## 2. Completeness Check

Verify every task has:
- [ ] Files section with exact paths
- [ ] Wave and Depends on fields
- [ ] Steps with code or commands
- [ ] Verification step

If incomplete, go back to Execute phase.

## 3. User Approval Gate

<HARD-GATE>
User must explicitly approve the plan before proceeding.
</HARD-GATE>

Ask: "Plan complete. Ready to save and proceed to implementation?"

Options:
- Yes, save and continue
- No, let's revise [specify what]
```

**Step 2: Verify**

Confirm 2-validate.md has 3 steps: Design Coverage Check with table format, Completeness Check with Wave/Depends verification, User Approval Gate.
