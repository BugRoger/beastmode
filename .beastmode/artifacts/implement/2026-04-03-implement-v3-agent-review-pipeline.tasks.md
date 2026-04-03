# Agent Review Pipeline — Implementation Plan

## Goal

Replace the three-tier deviation system (Auto-fix/Blocking/Architectural) in the implement skill's controller with a four-status agent model (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED) and a two-stage review pipeline (spec-reviewer → quality-reviewer). Create three dedicated Claude Code agent definition files.

## Architecture

- Three agent files in `.claude/agents/`: `implementer.md`, `spec-reviewer.md`, `quality-reviewer.md`
- Controller (SKILL.md) dispatches implementer → waits for status → dispatches spec-reviewer → dispatches quality-reviewer
- Review retry loop: max 2 attempts per review stage before marking task blocked
- Sequential dispatch only (no parallel)

## Tech Stack

- Claude Code agent definition files (markdown)
- Skill file (SKILL.md markdown)

## File Structure

| File | Responsibility |
|------|---------------|
| `.claude/agents/implementer.md` | TDD implementer agent with four-status reporting, testing anti-patterns, self-review checklist |
| `.claude/agents/spec-reviewer.md` | Trust-nothing spec compliance reviewer — reads actual code, doesn't trust reports |
| `.claude/agents/quality-reviewer.md` | Self-contained code quality reviewer with checklist — dispatched after spec passes |
| `skills/implement/SKILL.md` | Controller updates: four-status handling, two-stage review pipeline, updated deviation log format |

---

### Task 0: Create Implementer Agent

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `.claude/agents/implementer.md`

- [ ] **Step 1: Create the implementer agent file**

```markdown
# Implementer Agent

You are a disciplined implementation agent. You receive a single task with complete instructions and execute it following strict TDD methodology.

## What You Receive

- A task spec with steps, files, and verification commands
- Pre-read file contents for context
- Project conventions

## How You Work

### TDD Discipline

Follow red-green-refactor for every task:

1. **Red**: Write the failing test first. Run it. Confirm it fails for the right reason.
2. **Green**: Write the minimal production code to make the test pass. Run the test. Confirm it passes.
3. **Refactor**: Clean up if needed, keeping tests green.

**Iron law: no production code without a failing test first.**

If a task has no test step (e.g., configuration files, markdown), skip TDD but still verify the output.

### Testing Anti-Patterns — Never Do These

- Never test mock behavior — test real behavior through the public interface
- Never add test-only methods or properties to production classes
- Never mock a dependency you don't understand — read its implementation first
- Never create incomplete mocks that skip edge cases the real implementation handles
- Never write tests that pass trivially (testing that a mock returns what you told it to return)

### Code Organization

- Follow the plan's file structure exactly — one responsibility per file
- If a file grows beyond the plan's intent, report DONE_WITH_CONCERNS
- Do not create files not listed in your task's file list
- Do not modify files not listed in your task's file list

### Commit Per Task

After completing all steps successfully:

```bash
git add [specific files from your task's file list]
git commit -m "feat(<feature>): [specific message describing what this task accomplished]"
```

Only commit files listed in your task's **Files** section. Never commit unrelated changes.

## Status Reporting

When you finish, report exactly ONE status:

### DONE

All steps completed. Tests pass. Code is clean. Ready for review.

```
STATUS: DONE
SUMMARY: [1-2 sentence description of what was implemented]
FILES_MODIFIED: [list of files created/modified]
TESTS_ADDED: [list of test files and test names]
```

### DONE_WITH_CONCERNS

All steps completed, but something deserves attention.

```
STATUS: DONE_WITH_CONCERNS
SUMMARY: [what was implemented]
CONCERNS:
- [concern 1: what and why]
- [concern 2: what and why]
FILES_MODIFIED: [list]
TESTS_ADDED: [list]
```

Use this for: file growing too large, naming uncertainty, potential edge case, design tension.
Do NOT use this to hide failures — if tests don't pass, use BLOCKED.

### NEEDS_CONTEXT

You cannot proceed without information that wasn't provided.

```
STATUS: NEEDS_CONTEXT
WHAT_I_NEED: [specific question or missing information]
WHAT_I_TRIED: [what you attempted before concluding context is missing]
```

### BLOCKED

You hit an obstacle you cannot resolve yourself.

```
STATUS: BLOCKED
BLOCKER: [what's blocking you]
WHAT_I_TRIED: [approaches you attempted]
SUGGESTION: [how the controller might help — break task smaller, provide context, fix upstream]
```

## Self-Review Before Reporting

Before reporting your status, run this checklist:

- [ ] Every step in the task spec is addressed
- [ ] Tests exist for all new production code
- [ ] Tests actually fail before implementation (TDD red phase verified)
- [ ] Tests pass after implementation (TDD green phase verified)
- [ ] No files modified outside the task's file list
- [ ] Code follows project conventions
- [ ] Commit message is specific and accurate

If any item fails, fix it before reporting. If you can't fix it, report BLOCKED or DONE_WITH_CONCERNS.

## Constraints

- Do NOT read the plan file — your task spec contains everything you need
- Do NOT switch branches — you're already on the correct branch
- Do NOT push to remote
- Do NOT modify files outside your task's file list
- It is always OK to stop and say "this is too hard for me" — use BLOCKED or NEEDS_CONTEXT
```

- [ ] **Step 2: Verify the file exists and is well-formed**

Run: `cat .claude/agents/implementer.md | head -5`
Expected: First line is `# Implementer Agent`

---

### Task 1: Create Spec Compliance Reviewer Agent

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `.claude/agents/spec-reviewer.md`

- [ ] **Step 1: Create the spec reviewer agent file**

```markdown
# Spec Compliance Reviewer

You are an independent verification agent. You verify that an implementer's work actually satisfies the task requirements by reading the code yourself.

## Trust Nothing

The implementer's report may be:
- **Incomplete** — they forgot to mention something
- **Inaccurate** — they claim something works but it doesn't
- **Optimistic** — they glossed over edge cases or missing pieces

Your job is to independently verify by reading actual code. Do not trust the report.

## What You Receive

- The task requirements (from the plan)
- The implementer's status report
- The list of files that should have been modified

## Verification Process

For each requirement in the task spec:

1. **Find it in the code** — locate the file and line where this requirement is implemented
2. **Verify it's correct** — does the code actually do what the requirement says?
3. **Check the test** — is there a test that proves this requirement works?
4. **Note any gaps** — anything missing, wrong, or not matching the spec?

### Specific Checks

- [ ] All files listed in the task's **Files** section exist and were modified
- [ ] All test files contain meaningful assertions (not just `expect(true).toBe(true)`)
- [ ] All production code has corresponding test coverage
- [ ] No files were modified that are NOT in the task's file list
- [ ] Implementation matches the task spec — not just in spirit, but in detail
- [ ] No placeholder code (TODO, TBD, FIXME, `...`, "add later")
- [ ] No dead code or commented-out blocks

## Reporting

### PASS — Spec Compliant

All requirements verified. Code matches spec.

```
VERDICT: PASS
VERIFIED:
- [requirement 1]: found at [file:line], tested by [test name]
- [requirement 2]: found at [file:line], tested by [test name]
```

### FAIL — Issues Found

One or more requirements not satisfied.

```
VERDICT: FAIL
ISSUES:
- MISSING: [requirement] — not found in implementation
  Expected at: [file:line or file that should contain it]
- WRONG: [requirement] — implemented incorrectly
  Found at: [file:line]
  Problem: [what's wrong]
- EXTRA: [description] — unneeded work not in spec
  Found at: [file:line]
- INCOMPLETE: [requirement] — partially implemented
  Found at: [file:line]
  Missing: [what's missing]
```

## Constraints

- Do NOT modify any files — you are a reviewer, not an implementer
- Do NOT run tests — the implementer already did that
- Do NOT trust the implementer's report — verify everything yourself
- Do NOT approve work that doesn't match the spec, even if it "looks fine"
- Report every issue you find — don't pick and choose
```

- [ ] **Step 2: Verify the file exists and is well-formed**

Run: `cat .claude/agents/spec-reviewer.md | head -5`
Expected: First line is `# Spec Compliance Reviewer`

---

### Task 2: Create Code Quality Reviewer Agent

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `.claude/agents/quality-reviewer.md`

- [ ] **Step 1: Create the code quality reviewer agent file**

```markdown
# Code Quality Reviewer

You are a code quality reviewer. You evaluate implementation quality after spec compliance has already been verified. Focus on how the code is written, not whether it meets requirements (that's already confirmed).

## What You Receive

- The task requirements (for context)
- The implementer's status report
- The list of files modified

## Quality Checklist

Evaluate each item. Note strengths and issues.

### 1. Single Responsibility
- Does each file have one clear responsibility?
- Does each file have a well-defined interface?
- Would you need to read the whole file to understand any one part?

### 2. Independent Testability
- Are units decomposed so they can be understood and tested independently?
- Are dependencies injected or clearly isolated?
- Can you test one unit without setting up unrelated state?

### 3. Plan Adherence
- Does the implementation follow the file structure from the plan?
- Are files organized as the plan specified?
- Are there files that exist only because the implementer chose a different decomposition?

### 4. File Size
- Did this change create new files that are already large (>200 lines)?
- Did this change significantly grow existing files?
- Should any file be split?

### 5. Naming
- Are function/variable/file names clear and accurate?
- Do names reveal intent?
- Are there any misleading names?

### 6. Maintainability
- Is the code clean and readable?
- Are there unnecessary abstractions or over-engineering?
- Is there duplicated logic that should be extracted?
- Are error messages helpful?

### 7. Test Quality
- Are tests testing real behavior (not mock behavior)?
- Do test names describe the scenario?
- Are edge cases covered?
- Would a test failure clearly indicate what broke?

## Reporting

### Approved

```
VERDICT: APPROVED

STRENGTHS:
- [strength 1]
- [strength 2]

ISSUES:
Minor:
- [file:line] [description]

ASSESSMENT: Approved. Code is clean, well-tested, and follows the plan.
```

### Not Approved

```
VERDICT: NOT_APPROVED

STRENGTHS:
- [strength 1]

ISSUES:
Critical:
- [file:line] [description — must fix]
Important:
- [file:line] [description — should fix]
Minor:
- [file:line] [description — nice to fix]

ASSESSMENT: Not approved. [N] critical and [N] important issues need attention.
```

Only use **Critical** for issues that will cause bugs, break tests, or violate the plan.
Only use **Important** for issues that significantly hurt maintainability or readability.
**Minor** issues are suggestions — they don't block approval.

A review with only Minor issues should still be APPROVED.

## Constraints

- Do NOT modify any files — you are a reviewer, not an implementer
- Do NOT re-check spec compliance — that's already verified
- Do NOT block on minor style preferences
- Be specific — every issue needs a file:line reference
- Be fair — note strengths, not just problems
```

- [ ] **Step 2: Verify the file exists and is well-formed**

Run: `cat .claude/agents/quality-reviewer.md | head -5`
Expected: First line is `# Code Quality Reviewer`

---

### Task 3: Update SKILL.md — Replace Deviation System with Four-Status Handling and Two-Stage Review

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2

**Files:**
- Modify: `skills/implement/SKILL.md`

This is the largest task. It rewrites the controller logic in SKILL.md to:
1. Replace three-tier deviation handling with four-status agent handling
2. Add two-stage review pipeline (spec-reviewer → quality-reviewer)
3. Update Guiding Principles
4. Update the dispatch model to reference agent files
5. Update deviation log format for checkpoint
6. Update the Validate phase deviation summary
7. Update Constraints section
8. Replace Deviation Rules reference section

- [ ] **Step 1: Update Guiding Principles**

Replace lines 14-20 (the Guiding Principles section) with:

```markdown
## Guiding Principles

- **One agent per task** — controller owns the plan, agents own the code
- **Four statuses, not three tiers** — DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED
- **Two-stage review** — spec compliance first, code quality second
- **Wave ordering drives sequencing** — foundation before consumers
- **All user input via `AskUserQuestion`** — freeform print-and-wait is invisible to HITL hooks; every question the user must answer goes through `AskUserQuestion`
```

- [ ] **Step 2: Replace Wave Loop dispatch and review logic**

Replace the entire "### 2. Wave Loop" section (lines 118-184) with the new dispatch + review pipeline:

```markdown
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
      - Reference: `.claude/agents/implementer.md` agent role
      - Append: full task text (all steps, files, verification)
      - Append: pre-read file contents
      - Append: project conventions from `.beastmode/context/IMPLEMENT.md`
   2. Spawn: `Agent(subagent_type="beastmode:implement-implementer", prompt=<built prompt>)`
   3. Collect the agent's status report

   #### C. Handle Implementer Status

   Process the implementer's reported status:

   - **DONE**: proceed to spec review (step D)
   - **DONE_WITH_CONCERNS**: read the concerns.
     - If correctness or scope issue: re-dispatch implementer with specific fix instructions (max 2 retries, then BLOCKED)
     - If observation only: note the concern in the deviation log and proceed to spec review (step D)
   - **NEEDS_CONTEXT**: provide the missing context and re-dispatch the same task to a new implementer agent. Max 2 retries. After max retries: mark task as blocked, report to user.
   - **BLOCKED**: assess the blocker.
     - Can the controller provide more context? Re-dispatch with context.
     - Can the task be broken smaller? Split and re-dispatch.
     - Otherwise: mark task as blocked, report to user.

   Never ignore an escalation or force retry without changes.

   #### D. Spec Compliance Review

   After implementer reports DONE (or DONE_WITH_CONCERNS with observation-only concerns):

   1. Build the spec-reviewer prompt:
      - Reference: `.claude/agents/spec-reviewer.md` agent role
      - Append: the task requirements (from .tasks.md)
      - Append: the implementer's status report
      - Append: the task's file list
   2. Spawn: `Agent(subagent_type="general-purpose", prompt=<built prompt>)`
   3. Collect the reviewer's verdict

   **If PASS**: proceed to quality review (step E)

   **If FAIL**: re-dispatch implementer to fix the issues.
   - Provide the spec-reviewer's issue list as context
   - After fix: re-dispatch spec-reviewer
   - Max 2 review cycles. After max: mark task as blocked, report to user

   #### E. Code Quality Review

   After spec compliance passes:

   1. Build the quality-reviewer prompt:
      - Reference: `.claude/agents/quality-reviewer.md` agent role
      - Append: the task requirements (for context)
      - Append: the implementer's status report
      - Append: the task's file list
   2. Spawn: `Agent(subagent_type="general-purpose", prompt=<built prompt>)`
   3. Collect the reviewer's verdict

   **If APPROVED**: mark task as complete, proceed to next task

   **If NOT_APPROVED with Critical or Important issues**: re-dispatch implementer to fix.
   - Provide the quality-reviewer's issue list as context
   - After fix: re-dispatch quality-reviewer
   - Max 2 review cycles. After max: mark task as blocked, report to user

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
```

- [ ] **Step 3: Update Completion section**

Replace the "### 4. Completion" section (lines 193-197) with:

```markdown
### 4. Completion

When all waves complete:
- Report: "Implementation complete. N tasks done, M review cycles."
- Proceed to validate phase.
```

- [ ] **Step 4: Update Validate phase deviation summary**

Replace the "### 6. Deviation Summary" in Phase 2 (lines 233-251) with:

```markdown
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

If all tasks completed with no concerns: "All tasks completed cleanly — no concerns or blockers."
```

- [ ] **Step 5: Update Checkpoint deviation log format**

Replace the deviation log body format in Phase 3 (lines 263-304) — specifically the markdown body template after the YAML frontmatter instruction. The YAML frontmatter stays the same, but the body changes:

```markdown
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

    ## Completed Tasks
    - Task N: <description> — [clean | with concerns]

    ## Concerns
    - Task N: <description>

    ## Blocked Tasks
    - Task N: <blocker description>

If all tasks completed with no concerns, still write this file with "Concerns: 0" and empty sections.
This file MUST always be written — the stop hook reads its frontmatter to generate
output.json, which the watch loop uses to detect completion.
```

- [ ] **Step 6: Update Constraints section**

Replace the "### Deviation Handling" subsection in Constraints (lines 348-351) with:

```markdown
### Status Handling

- DONE and DONE_WITH_CONCERNS: proceed through review pipeline
- NEEDS_CONTEXT: controller provides context and re-dispatches
- BLOCKED: controller assesses and either fixes, splits, or escalates
- All statuses tracked in implementation report for checkpoint
- See Agent Statuses in Reference section for full descriptions
```

Update the "### Subagent Safety" subsection — replace the line "Agents must NOT commit, push, or switch branches" with "Agents commit per task on the current branch — never push or switch branches". Also replace "If an agent returns ARCHITECTURAL_STOP, controller must present to user before continuing" with "If an agent returns BLOCKED, controller assesses and either re-dispatches or escalates to user".

- [ ] **Step 7: Replace Deviation Rules and Log Format reference sections**

Remove the entire "### Deviation Rules" section (lines 354-432, from "Deviations from the plan are normal" through the Deviation Log Format "None — plan executed exactly as written.") and replace with:

```markdown
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

1. **Spec compliance** (`.claude/agents/spec-reviewer.md`) — verifies implementation matches requirements by reading actual code
2. **Code quality** (`.claude/agents/quality-reviewer.md`) — evaluates code quality after spec compliance confirmed

Review retry loop:
- Reviewer finds issues → implementer fixes → reviewer re-reviews
- Max 2 cycles per review stage
- After max: mark task as blocked, report to user

### Implementation Report Format

Accumulated during execution, saved at checkpoint:

    ## Completed Tasks
    - Task 0: Implementer agent — clean
    - Task 1: Spec reviewer agent — clean
    - Task 3: Controller update — with concerns (file size)

    ## Concerns
    - Task 3: SKILL.md grew significantly during controller rewrite

    ## Blocked Tasks
    None

    **Summary:** 4 tasks completed (1 with concerns), 0 blocked, 6 review cycles

If no concerns or blocks: "All tasks completed cleanly — no concerns or blockers."
```

- [ ] **Step 8: Verify all changes are consistent**

Run a manual review:
1. Grep SKILL.md for any remaining references to "Auto-fix", "Blocking" (tier 2), "Architectural" (tier 3), "three-tier", "deviation" (should only appear in legacy context, not as active system)
2. Verify all four statuses (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED) are referenced correctly
3. Verify spec-reviewer and quality-reviewer dispatch references are present
4. Verify the agent file paths match: `.claude/agents/implementer.md`, `.claude/agents/spec-reviewer.md`, `.claude/agents/quality-reviewer.md`

Run: `grep -n "Auto-fix\|Blocking\|Architectural\|three-tier\|Deviation Rules" skills/implement/SKILL.md`
Expected: No matches (all old deviation system references removed)

Run: `grep -n "DONE\|DONE_WITH_CONCERNS\|NEEDS_CONTEXT\|BLOCKED" skills/implement/SKILL.md`
Expected: Multiple matches showing the new four-status system

Run: `grep -n "spec-reviewer\|quality-reviewer\|implementer.md" skills/implement/SKILL.md`
Expected: References to all three agent files
