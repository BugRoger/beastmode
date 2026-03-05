# HITL Adherence Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Make HITL gates actually work by converting invisible HTML comments and @imported files into explicit task-runner steps with dynamic substep pruning.

**Architecture:** Replace 15 broken `<!-- HITL-GATE -->` + `@gate-check.md` annotations with `## N. Gate: <id>` numbered steps containing human/auto substeps. Extend task-runner.md with gate detection logic. Demote shared gate/transition files to reference-only.

**Tech Stack:** Markdown skill definitions, YAML config (`.beastmode/config.yaml`)

**Design Doc:** [.beastmode/state/design/2026-03-05-hitl-adherence.md](../design/2026-03-05-hitl-adherence.md)

---

### Task 0: Add Gate Step Detection to Task Runner

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/task-runner.md:53-54`

**Step 1: Add gate detection block after lazy expansion**

In `skills/_shared/task-runner.md`, insert a new section between the lazy expansion block and the "Execute the task content" line. Add after line 52 (`CONTINUE LOOP`), before line 54 (`Execute the task content`):

```markdown
  # --- Gate detection ---
  IF task.content matches pattern "Gate: <gate-id>":
    Read `.beastmode/config.yaml`
    Look up gate-id:
      - If gate-id starts with "transitions." → check under `transitions:` key
      - Otherwise → check under `gates:` key (e.g., "design.design-approval" → gates.design.design-approval)
    Resolve mode: config value, or "human" if config missing or key not found
    Find child tasks (N.1, N.2, etc.) — each starts with a mode label (e.g., "human — ...", "auto — ...")
    Remove all children whose mode label does NOT match the resolved mode
    Set the surviving child to "in_progress"
    Update TodoWrite
    CONTINUE LOOP (surviving child executes, parent completes when child done)
```

**Step 2: Verify**

Read the modified file and confirm:
- Gate detection block appears between lazy expansion and task execution
- Pattern matching uses "Gate:" prefix
- Config lookup supports both `gates.` and `transitions.` paths
- Default mode is "human" when config is missing

---

### Task 1: Convert Design 0-prime Gate

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/design/phases/0-prime.md:58-65`

**Step 1: Replace the existing-design-choice gate**

Replace lines 58-65 (the `<!-- HITL-GATE -->` comment through the auto behavior) with:

```markdown
## 7. Gate: design.existing-design-choice

Read `.beastmode/config.yaml` → check `gates.design.existing-design-choice`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 7.1 human — Ask User

If a prior design doc exists for the same topic (matching feature name):
- Ask: "Found existing design for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh

### 7.2 auto — Claude Decides

Read the existing design and decide whether to update or start fresh based on how different the new requirements are.
Log: "Gate `design.existing-design-choice` → auto: <decision>"
```

Note: This becomes step 7 because it follows step 6 (Express Path Check). The gate replaces the inline content that was previously after step 6.

**Step 2: Remove the @import**

Delete the `@../_shared/gate-check.md` line (was line 59).

**Step 3: Verify**

Run: `grep -c "HITL-GATE\|gate-check" skills/design/phases/0-prime.md`
Expected: 0

---

### Task 2: Convert Design 1-execute Gates (3 gates)

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/design/phases/1-execute.md:43-44,46-58,60-61,63-78,80-88,90-96`

**Step 1: Replace gray-area-selection gate (around line 43)**

Replace the `<!-- HITL-GATE: design.gray-area-selection -->` block and the following `@../_shared/gate-check.md` import and the step 4 content (lines 43-58) with a unified gate step. The step numbering needs to shift — "Identify Gray Areas" was step 3, so the gate becomes step 4:

```markdown
## 4. Gate: design.gray-area-selection

Read `.beastmode/config.yaml` → check `gates.design.gray-area-selection`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 4.1 human — Ask User

Use `AskUserQuestion` with `multiSelect: true`:

- header: "Discuss"
- question: "Which areas do you want to discuss for [topic]?"
- Each option: specific area label + 1-2 sentence description
- Annotate with codebase context: "(Card component exists with variants)"
- Annotate with prior decisions: "(You chose X in the Y design)"

At least 1 area must be discussed. Do NOT include "skip all."

### 4.2 auto — Select All

Select all areas for internal analysis without asking.
Log: "Gate `design.gray-area-selection` → auto: all areas selected"
Proceed to discuss each using Claude's judgment.
```

**Step 2: Replace gray-area-discussion gate (around line 60)**

Replace the `<!-- HITL-GATE: design.gray-area-discussion -->` + `@import` and the step 5 content with:

```markdown
## 5. Gate: design.gray-area-discussion

Read `.beastmode/config.yaml` → check `gates.design.gray-area-discussion`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 5.1 human — Interactive Discussion

For each selected area:

1. Ask up to 4 questions using `AskUserQuestion`
   - Include "You decide" as a valid option on every question
   - Annotate options with codebase context when relevant
2. After 4 questions, check: "More questions about [area], or next?"
   - If "More" → 4 more questions, then check again
   - If "Next" → move to next area
3. Track "Claude's Discretion" items separately
4. **Scope guardrail**: If user suggests a new capability (not clarifying current design):
   "That sounds like its own feature — I'll note it as a deferred idea. Back to [area]."
5. Maintain running "Deferred Ideas" list internally

### 5.2 auto — Claude Decides

Make reasonable decisions for each area based on codebase context and prior decisions.
Log each decision inline. No AskUserQuestion calls.
```

**Step 3: Replace section-review gate (around line 87)**

Replace the `<!-- HITL-GATE: design.section-review -->` + `@import` and the step 7 content with:

```markdown
## 7. Gate: design.section-review

Read `.beastmode/config.yaml` → check `gates.design.section-review`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 7.1 human — Section-by-Section Review

Once requirements understood:
- Scale each section to complexity
- Ask after each section if it looks right
- Cover: architecture, components, data flow, error handling, testing

### 7.2 auto — Present Full Design

Present the full design without per-section approval pauses.
Proceed directly to validation.
Log: "Gate `design.section-review` → auto: full design presented"
```

Note: Step 6 (Propose Approaches) stays as-is. Steps renumber: 1-Create Worktree, 2-Scout, 3-Identify Gray Areas, 4-Gate:selection, 5-Gate:discussion, 6-Propose Approaches, 7-Gate:review, 8-Iterate.

**Step 4: Verify**

Run: `grep -c "HITL-GATE\|gate-check" skills/design/phases/1-execute.md`
Expected: 0

Run: `grep -c "## [0-9]*\. Gate:" skills/design/phases/1-execute.md`
Expected: 3

---

### Task 3: Convert Design 2-validate Gate

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/design/phases/2-validate.md:27-42`

**Step 1: Replace the design-approval gate**

Replace lines 27-42 (step 3 header through the auto bullet) with:

```markdown
## 3. Gate: design.design-approval

Read `.beastmode/config.yaml` → check `gates.design.design-approval`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 3.1 human — User Approval

Ask: "Does this design look complete? Ready to document?"

Options:
- Yes, document it
- No, let's revise [specify what]

Wait for user response before continuing.

### 3.2 auto — Self-Approve

Log: "Gate `design.design-approval` → auto: approved"
Proceed to checkpoint.
```

This removes:
- The `<!-- HITL-GATE -->` comment
- The `@../_shared/gate-check.md` import
- The `<HARD-GATE>User must explicitly approve</HARD-GATE>` block (conflicts with auto mode)
- The `- **auto**: ...` bullet

**Step 2: Verify**

Run: `grep -c "HITL-GATE\|gate-check\|HARD-GATE" skills/design/phases/2-validate.md`
Expected: 0

---

### Task 4: Convert Design 3-checkpoint Transition

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md:37-44`

**Step 1: Replace the design-to-plan transition**

Replace lines 37-44 (step 5 header through "Do NOT invoke" line) with:

```markdown
## 5. Gate: transitions.design-to-plan

Read `.beastmode/config.yaml` → check `transitions.design-to-plan`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 5.1 human — Suggest Next Step

Print and STOP:
Next step: `/beastmode:plan .beastmode/state/design/YYYY-MM-DD-<topic>.md`

Do NOT invoke any implementation skill directly.

### 5.2 auto — Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:plan", args=".beastmode/state/design/YYYY-MM-DD-<topic>.md")`

If below threshold, print:
Context is low. Start a new session and run:
`/beastmode:plan .beastmode/state/design/YYYY-MM-DD-<topic>.md`
STOP.
```

This removes:
- The `<!-- HITL-GATE -->` comment
- The `@../_shared/transition-check.md` import

**Step 2: Verify**

Run: `grep -c "HITL-GATE\|transition-check" skills/design/phases/3-checkpoint.md`
Expected: 0

---

### Task 5: Convert Plan 2-validate Gate

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/plan/phases/2-validate.md:55-70`

**Step 1: Replace the plan-approval gate**

Replace lines 55-70 (step 4 header through auto bullet) with:

```markdown
## 4. Gate: plan.plan-approval

Read `.beastmode/config.yaml` → check `gates.plan.plan-approval`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 4.1 human — User Approval

Ask: "Plan complete. Ready to save and proceed to implementation?"

Options:
- Yes, save and continue
- No, let's revise [specify what]

Wait for user response before continuing.

### 4.2 auto — Self-Approve

Log: "Gate `plan.plan-approval` → auto: approved"
Proceed to checkpoint.
```

This removes the `<!-- HITL-GATE -->`, `@gate-check.md`, and the `<HARD-GATE>` block.

**Step 2: Verify**

Run: `grep -c "HITL-GATE\|gate-check\|HARD-GATE" skills/plan/phases/2-validate.md`
Expected: 0

---

### Task 6: Convert Plan 3-checkpoint Transition

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/plan/phases/3-checkpoint.md:30-39`

**Step 1: Replace the plan-to-implement transition**

Replace lines 30-39 (step 5 header through "Next skill" line) with:

```markdown
## 5. Gate: transitions.plan-to-implement

Read `.beastmode/config.yaml` → check `transitions.plan-to-implement`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode.
</HARD-GATE>

### 5.1 human — Suggest Next Step

Print and STOP:
Next step: `/beastmode:implement .beastmode/state/plan/YYYY-MM-DD-<feature-name>.md`

### 5.2 auto — Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:implement", args=".beastmode/state/plan/YYYY-MM-DD-<feature-name>.md")`

If below threshold, print session-restart instructions and STOP.
```

Note: The `<HARD-GATE>` about EnterPlanMode is kept — it's an unconditional constraint, not a configurable gate.

**Step 2: Verify**

Run: `grep -c "HITL-GATE\|transition-check" skills/plan/phases/3-checkpoint.md`
Expected: 0

---

### Task 7: Convert Implement 1-execute Gates (2 gates)

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/implement/phases/1-execute.md:56-69,91-100`

**Step 1: Replace architectural-deviation gate (around line 61)**

Replace lines 56-69 (from the "Auto-fix / Blocking" line through the auto bullet) with a new substep under 1.4:

```markdown
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
```

Note: This gate lives inside a ### substep (1.4), so it uses #### and ##### headings. The task runner detects "Gate:" in the title regardless of heading level.

**Step 2: Replace blocked-task-decision gate (around line 95)**

Replace lines 91-100 (step 2 content) with:

```markdown
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
```

**Step 3: Remove @imports**

Delete both `@../_shared/gate-check.md` lines.

**Step 4: Verify**

Run: `grep -c "HITL-GATE\|gate-check" skills/implement/phases/1-execute.md`
Expected: 0

---

### Task 8: Convert Implement 2-validate Gate

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/implement/phases/2-validate.md:55-68`

**Step 1: Replace the validation-failure gate**

Replace lines 55-68 (step 7 header through auto bullet) with:

```markdown
## 7. Gate: implement.validation-failure

If any check still fails after fix loop:
- Report failures with full context
- Do NOT proceed to checkpoint

Read `.beastmode/config.yaml` → check `gates.implement.validation-failure`.
Default: `auto`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 7.1 human — Ask User

Ask: "Fix manually and re-run /implement, or investigate together?"

### 7.2 auto — Claude Investigates

Attempt additional investigation and targeted fixes. After exhausting options, log the failures and proceed to checkpoint with a warning.
Do NOT proceed to next phase if critical tests fail.
Log: "Gate `implement.validation-failure` → auto: <decision>"
```

**Step 2: Verify**

Run: `grep -c "HITL-GATE\|gate-check" skills/implement/phases/2-validate.md`
Expected: 0

---

### Task 9: Convert Implement 3-checkpoint Transition

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/implement/phases/3-checkpoint.md:33-38`

**Step 1: Replace the implement-to-validate transition**

Replace lines 33-38 (step 4 header through "Next skill" line) with:

```markdown
## 4. Gate: transitions.implement-to-validate

Read `.beastmode/config.yaml` → check `transitions.implement-to-validate`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 4.1 human — Suggest Next Step

Print and STOP:
Next step: `/beastmode:validate YYYY-MM-DD-<feature>.md`

### 4.2 auto — Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:validate", args="YYYY-MM-DD-<feature>.md")`

If below threshold, print session-restart instructions and STOP.
```

**Step 2: Verify**

Run: `grep -c "HITL-GATE\|transition-check" skills/implement/phases/3-checkpoint.md`
Expected: 0

---

### Task 10: Convert Validate 3-checkpoint Transition

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/validate/phases/3-checkpoint.md:15-29`

**Step 1: Replace the validate-to-release transition**

Replace lines 15-29 (step 4 header through "Next skill" line) with:

```markdown
## 4. Gate: transitions.validate-to-release

If FAIL:
```
Validation failed. Fix issues and re-run:
/validate
```
STOP — do not proceed to transition check.

If PASS:

Read `.beastmode/config.yaml` → check `transitions.validate-to-release`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 4.1 human — Suggest Next Step

Print and STOP:
Next step: `/beastmode:release YYYY-MM-DD-<feature>.md`

### 4.2 auto — Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:release", args="YYYY-MM-DD-<feature>.md")`

If below threshold, print session-restart instructions and STOP.
```

**Step 2: Verify**

Run: `grep -c "HITL-GATE\|transition-check" skills/validate/phases/3-checkpoint.md`
Expected: 0

---

### Task 11: Convert Release 1-execute Gates (2 gates)

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/release/phases/1-execute.md:41-46,123-130`

**Step 1: Replace version-confirmation gate (around line 41)**

Replace lines 41-46 (the HITL-GATE comment through auto bullet) with a gate step embedded within step 3:

```markdown
### 3.1 Gate: release.version-confirmation

Read `.beastmode/config.yaml` → check `gates.release.version-confirmation`.
Default: `human`. Execute ONLY the matching option below.

#### human — Ask User

Increment from `$current_version`. Present suggested version via AskUserQuestion with override option.

#### auto — Auto-Detect

Use the auto-detected version bump without asking.
Log: "Gate `release.version-confirmation` → auto: vX.Y.Z"
```

Note: This gate is a substep of step 3 (Determine Version), so it uses ### and #### headings.

**Step 2: Replace product-md-approval gate (around line 123)**

Replace lines 123-130 (the HITL-GATE comment through auto bullet) with a gate step embedded within step 8.5:

```markdown
### 8.6 Gate: release.product-md-approval

Read `.beastmode/config.yaml` → check `gates.release.product-md-approval`.
Default: `auto`. Execute ONLY the matching option below.

#### human — Ask User

**Significance check:**
- If Capabilities or How It Works changed → present the before/after diff for user approval
- If neither changed → auto-apply silently

#### auto — Auto-Apply

Auto-apply all changes.
Log: "Gate `release.product-md-approval` → auto: updated PRODUCT.md with N new capabilities"
```

**Step 3: Remove @imports**

Delete both `@../_shared/gate-check.md` lines.

**Step 4: Verify**

Run: `grep -c "HITL-GATE\|gate-check" skills/release/phases/1-execute.md`
Expected: 0

---

### Task 12: Demote Shared Gate Files to Reference-Only

**Wave:** 3
**Depends on:** Tasks 1-11

**Files:**
- Modify: `skills/_shared/gate-check.md`
- Modify: `skills/_shared/transition-check.md`

**Step 1: Update gate-check.md header**

Replace the opening of `skills/_shared/gate-check.md` with:

```markdown
# Gate Check — Reference Only

> **Note:** This file is documentation only. Gate logic is now executed inline via `## N. Gate:` steps in each phase file, processed by the task runner. This file is NOT @imported by any phase file.

Gate behavior by mode, for reference:
```

Keep the rest of the file as-is for documentation.

**Step 2: Update transition-check.md header**

Replace the opening of `skills/_shared/transition-check.md` with:

```markdown
# Transition Check — Reference Only

> **Note:** This file is documentation only. Transition logic is now executed inline via `## N. Gate: transitions.*` steps in each phase checkpoint, processed by the task runner. This file is NOT @imported by any phase file.

Transition behavior by mode, for reference:
```

Keep the phase-to-skill mapping table as-is for documentation.

**Step 3: Verify no remaining @imports**

Run: `grep -r "@../_shared/gate-check\|@../_shared/transition-check" skills/*/phases/`
Expected: 0 matches

---

### Task 13: Final Verification

**Wave:** 4
**Depends on:** Tasks 0-12

**Files:**
- (read-only verification)

**Step 1: Verify all HTML gate comments removed**

Run: `grep -r "HITL-GATE" skills/`
Expected: 0 matches

**Step 2: Count all gate steps**

Run: `grep -r "Gate:" skills/*/phases/*.md skills/_shared/task-runner.md | grep "##"`
Expected: 15 gate steps total (11 intra-phase + 4 transitions)

**Step 3: Verify no conflicting HARD-GATEs on configurable gates**

Run: `grep -B5 -A5 "HARD-GATE" skills/*/phases/*.md`
Verify: remaining HARD-GATEs are only unconditional constraints (EnterPlanMode prohibition, design constraints), NOT conflicting with any `Gate:` step.

**Step 4: Verify all @imports removed**

Run: `grep -r "gate-check\|transition-check" skills/*/phases/`
Expected: 0 matches (references may still exist in shared files as documentation)

**Step 5: Verify gate runner in task-runner.md**

Read `skills/_shared/task-runner.md` and confirm gate detection block exists between lazy expansion and task execution.
