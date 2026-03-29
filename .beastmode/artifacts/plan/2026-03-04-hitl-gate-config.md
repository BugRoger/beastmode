# HITL Gate Configuration Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Add configurable HITL gates across all workflow phases with smart self-chaining transitions between phases.

**Architecture:** Create `.beastmode/config.yaml` for gate configuration, shared `gate-check.md` and `transition-check.md` utilities, annotate all existing gates with `<!-- HITL-GATE -->` comments, and add smart transition logic to each phase checkpoint that reads config and auto-advances or stops based on context remaining.

**Tech Stack:** Markdown, YAML

**Design Doc:** `.beastmode/state/design/2026-03-04-hitl-gate-config.md`

---

### Task 0: Create config.yaml with gate defaults

**Wave:** 1
**Depends on:** -
**Parallel-safe:** true

**Files:**
- Create: `.beastmode/config.yaml`

**Step 1: Create the config file**

```yaml
# .beastmode/config.yaml
# Gate modes: human (stop for user) | auto (Claude decides)

gates:
  design:
    existing-design-choice: human    # INTERACTIVE — prior design found, ask what to do
    gray-area-selection: human       # INTERACTIVE — which areas to discuss
    gray-area-discussion: human      # INTERACTIVE — question loop per area
    section-review: human            # INTERACTIVE — section-by-section review
    design-approval: human           # APPROVAL — approve before documenting

  plan:
    plan-approval: human             # APPROVAL — approve before saving

  implement:
    architectural-deviation: auto    # CONDITIONAL — tier 3 deviation decision
    blocked-task-decision: auto      # CONDITIONAL — blocked task with dependents
    validation-failure: auto         # CONDITIONAL — fix loop exhausted

  release:
    version-confirmation: human      # APPROVAL — version bump override

transitions:
  design-to-plan: human              # TRANSITION
  plan-to-implement: human           # TRANSITION
  implement-to-validate: auto        # TRANSITION
  validate-to-release: human         # TRANSITION

  context_threshold: 60              # % remaining context required to auto-advance
```

**Step 2: Verify**

Read `.beastmode/config.yaml` and confirm it is valid YAML with all 10 gate entries and 4 transition entries.

---

### Task 1: Create gate-check.md shared utility

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `skills/_shared/gate-check.md`

**Step 1: Write the gate-check shared utility**

Create `skills/_shared/gate-check.md` with:

```markdown
# Gate Check

Evaluate a HITL gate by reading `.beastmode/config.yaml` and branching on the gate's mode.

## Usage

At any gate point in a phase file, after the `<!-- HITL-GATE: ... -->` annotation:

1. Read `.beastmode/config.yaml`
2. Look up the gate ID under `gates.<phase>.<gate-name>`
3. If config file not found or gate ID not found → default to `human`

## Behavior by Mode

### human
Execute the gate's original behavior:
- For APPROVAL gates: use AskUserQuestion with approval options
- For INTERACTIVE gates: use AskUserQuestion with discussion options
- For CONDITIONAL gates: present the decision to the user

### auto
Claude makes the decision and continues without asking:
- For APPROVAL gates: self-approve and proceed
- For INTERACTIVE gates: make reasonable choices (pick areas, answer own design questions, approve sections)
- For CONDITIONAL gates: make the judgment call based on context (e.g., fix the issue, pick the version, handle the deviation)

Log auto decisions inline: "Gate `<gate-id>` → auto: <decision made>"
```

**Step 2: Verify**

Confirm file exists at `skills/_shared/gate-check.md` and contains both `human` and `auto` behavior sections.

---

### Task 2: Create transition-check.md shared utility

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `skills/_shared/transition-check.md`

**Step 1: Write the transition-check shared utility**

Create `skills/_shared/transition-check.md` with:

````markdown
# Transition Check

Smart phase-to-phase transition logic. Import this in each phase's 3-checkpoint.md at the "Suggest Next Step" position.

## Usage

Replace hardcoded "Suggest /next-skill" blocks with:

```
@../_shared/transition-check.md
```

## Logic

1. Read `.beastmode/config.yaml`
2. Look up `transitions.<current-phase>-to-<next-phase>`
3. If config file not found or transition not found → default to `human`

### human mode
Print the next step suggestion and STOP:
```
Next step:
/next-skill <artifact-path>
```

### auto mode
1. Check context remaining (estimate from conversation length)
2. Read `transitions.context_threshold` (default: 60)
3. If context remaining >= threshold:
   - Run `/compact` to condense current context
   - Invoke the next skill: `/next-skill <artifact-path>`
4. If context remaining < threshold:
   - Print:
     ```
     Context is low (~X% remaining). Start a new session and run:
     /next-skill <artifact-path>
     ```
   - STOP

## Phase-to-Skill Mapping

| Transition | Next Skill | Artifact |
|-----------|------------|----------|
| design-to-plan | /plan | `.beastmode/state/design/YYYY-MM-DD-<feature>.md` |
| plan-to-implement | /implement | `.beastmode/state/plan/YYYY-MM-DD-<feature>.md` |
| implement-to-validate | /validate | (no artifact needed) |
| validate-to-release | /release | (no artifact needed) |
````

**Step 2: Verify**

Confirm file exists at `skills/_shared/transition-check.md` and contains the phase-to-skill mapping table.

---

### Task 3: Annotate design skill gates

**Wave:** 2
**Depends on:** Task 1
**Parallel-safe:** true

**Files:**
- Modify: `skills/design/phases/0-prime.md`
- Modify: `skills/design/phases/1-execute.md`
- Modify: `skills/design/phases/2-validate.md`

**Step 1: Annotate 0-prime.md — existing-design-choice gate**

Before the line `If a prior design doc exists for the same topic (matching feature name):` (line 58), insert:

```markdown
<!-- HITL-GATE: design.existing-design-choice | INTERACTIVE -->
@../_shared/gate-check.md
```

After the existing Options block, add:

```markdown
- **auto**: Claude reads the existing design and decides whether to update or start fresh based on how different the new requirements are. Log the decision.
```

**Step 2: Annotate 1-execute.md — gray-area-selection gate**

Before step 4 "Present Gray Areas" heading, insert:

```markdown
<!-- HITL-GATE: design.gray-area-selection | INTERACTIVE -->
@../_shared/gate-check.md
```

After the `At least 1 area must be discussed. Do NOT include "skip all."` line, add:

```markdown
- **auto**: Claude selects all areas for internal analysis without asking. Proceed to discuss each using Claude's judgment.
```

**Step 3: Annotate 1-execute.md — gray-area-discussion gate**

Before step 5 "Discuss Selected Areas" heading, insert:

```markdown
<!-- HITL-GATE: design.gray-area-discussion | INTERACTIVE -->
@../_shared/gate-check.md
```

After the existing step 5 content, add:

```markdown
- **auto**: Claude makes reasonable decisions for each area based on codebase context and prior decisions. Log each decision inline. No AskUserQuestion calls.
```

**Step 4: Annotate 1-execute.md — section-review gate**

Before step 7 "Present Design" heading, insert:

```markdown
<!-- HITL-GATE: design.section-review | INTERACTIVE -->
@../_shared/gate-check.md
```

After the `Ask after each section if it looks right` line, add:

```markdown
- **auto**: Claude presents the full design without per-section approval pauses. Proceed directly to validation.
```

**Step 5: Annotate 2-validate.md — design-approval gate**

Before the existing `<HARD-GATE>` block (line 29), insert:

```markdown
<!-- HITL-GATE: design.design-approval | APPROVAL -->
@../_shared/gate-check.md
```

After the Options block, add:

```markdown
- **auto**: Claude self-approves and proceeds to checkpoint. Log: "Gate `design.design-approval` → auto: approved"
```

**Step 6: Verify**

Run: `grep -rn "HITL-GATE" skills/design/phases/`

Expected: 5 matches across 0-prime.md, 1-execute.md (3), 2-validate.md.

---

### Task 4: Annotate plan skill gates

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `skills/plan/phases/2-validate.md`

**Step 1: Annotate 2-validate.md — plan-approval gate**

Before the existing `<HARD-GATE>` block (line 57), insert:

```markdown
<!-- HITL-GATE: plan.plan-approval | APPROVAL -->
@../_shared/gate-check.md
```

After the Options block, add:

```markdown
- **auto**: Claude self-approves the plan and proceeds to checkpoint. Log: "Gate `plan.plan-approval` → auto: approved"
```

**Step 2: Verify**

Run: `grep -rn "HITL-GATE" skills/plan/phases/`

Expected: 1 match in 2-validate.md.

---

### Task 5: Annotate implement skill gates

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `skills/implement/phases/1-execute.md`
- Modify: `skills/implement/phases/2-validate.md`

**Step 1: Annotate 1-execute.md — architectural-deviation gate**

Before the line `- **Architectural**: Present to user via AskUserQuestion:` (in step 1.4), insert:

```markdown
<!-- HITL-GATE: implement.architectural-deviation | CONDITIONAL -->
@../_shared/gate-check.md
```

After the existing options block, add:

```markdown
- **auto**: Claude evaluates the deviation and proceeds with the proposed change. If the deviation is clearly safe, continue. If ambiguous, proceed cautiously and log. Log: "Gate `implement.architectural-deviation` → auto: <decision>"
```

**Step 2: Annotate 1-execute.md — blocked-task-decision gate**

Before the line `- Ask: "Skip dependent tasks or investigate?"` (in step 2), insert:

```markdown
<!-- HITL-GATE: implement.blocked-task-decision | CONDITIONAL -->
@../_shared/gate-check.md
```

After the Ask line, add:

```markdown
- **auto**: Claude investigates the blocked task. If resolvable, fix and continue. If not, skip dependent tasks and log the decision.
```

**Step 3: Annotate 2-validate.md — validation-failure gate**

Before the line `- Ask user: "Fix manually and re-run /implement, or investigate together?"` (in step 7), insert:

```markdown
<!-- HITL-GATE: implement.validation-failure | CONDITIONAL -->
@../_shared/gate-check.md
```

After the Ask line, add:

```markdown
- **auto**: Claude attempts additional investigation and targeted fixes. After exhausting options, log the failures and proceed to checkpoint with a warning. Do NOT proceed to next phase if critical tests fail.
```

**Step 4: Verify**

Run: `grep -rn "HITL-GATE" skills/implement/phases/`

Expected: 3 matches (2 in 1-execute.md, 1 in 2-validate.md).

---

### Task 6: Annotate release skill gates

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `skills/release/phases/1-execute.md`

**Step 1: Annotate 1-execute.md — version-confirmation gate**

Before the line `Increment from $current_version (not from tag). Present suggested version via AskUserQuestion with override option.` (line 47), insert:

```markdown
<!-- HITL-GATE: release.version-confirmation | APPROVAL -->
@../_shared/gate-check.md
```

After the existing line, add:

```markdown
- **auto**: Claude uses the auto-detected version bump without asking. Log: "Gate `release.version-confirmation` → auto: vX.Y.Z"
```

**Step 2: Verify**

Run: `grep -rn "HITL-GATE" skills/release/phases/`

Expected: 1 match in 1-execute.md.

---

### Task 7: Add transition logic to design checkpoint

**Wave:** 3
**Depends on:** Task 2
**Parallel-safe:** true

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md`

**Step 1: Replace "Suggest Next Step" with transition check**

Replace lines 37-44 (step 5):

```markdown
## 5. Suggest Next Step

```
/plan .beastmode/state/design/YYYY-MM-DD-<topic>.md
```

The terminal state is suggesting /plan. Do NOT invoke any implementation skill.
```

With:

```markdown
## 5. Phase Transition

<!-- HITL-GATE: transitions.design-to-plan | TRANSITION -->
@../_shared/transition-check.md

Next skill: `/plan .beastmode/state/design/YYYY-MM-DD-<topic>.md`

Do NOT invoke any implementation skill directly — only via transition-check auto mode.
```

**Step 2: Verify**

Confirm `skills/design/phases/3-checkpoint.md` contains `transition-check.md` import and `HITL-GATE` annotation.

---

### Task 8: Add transition logic to plan checkpoint

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `skills/plan/phases/3-checkpoint.md`

**Step 1: Replace "Suggest Next Step" with transition check**

Replace lines 30-39 (step 5):

```markdown
## 5. Suggest Next Step

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode. DO NOT automatically start implementation.
</HARD-GATE>

```
/implement .beastmode/state/plan/YYYY-MM-DD-<feature-name>.md
```
```

With:

```markdown
## 5. Phase Transition

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode.
</HARD-GATE>

<!-- HITL-GATE: transitions.plan-to-implement | TRANSITION -->
@../_shared/transition-check.md

Next skill: `/implement .beastmode/state/plan/YYYY-MM-DD-<feature-name>.md`
```

**Step 2: Verify**

Confirm `skills/plan/phases/3-checkpoint.md` retains the EnterPlanMode HARD-GATE and contains transition-check import.

---

### Task 9: Add transition logic to implement checkpoint

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `skills/implement/phases/3-checkpoint.md`

**Step 1: Replace "Suggest Next Step" with transition check**

Replace lines 33-36 (step 4):

```markdown
## 4. Suggest Next Step

    /validate
```

With:

```markdown
## 4. Phase Transition

<!-- HITL-GATE: transitions.implement-to-validate | TRANSITION -->
@../_shared/transition-check.md

Next skill: `/validate`
```

**Step 2: Verify**

Confirm `skills/implement/phases/3-checkpoint.md` contains the transition-check import.

---

### Task 10: Add transition logic to validate checkpoint

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `skills/validate/phases/3-checkpoint.md`

**Step 1: Replace "Suggest Next Step" with transition check**

Replace lines 15-28 (step 4):

```markdown
## 4. Suggest Next Step

If PASS:
```
Validation passed! Ready for release:
/release
```

If FAIL:
```
Validation failed. Fix issues and re-run:
/validate
```
```

With:

```markdown
## 4. Phase Transition

If FAIL:
```
Validation failed. Fix issues and re-run:
/validate
```
STOP — do not proceed to transition check.

If PASS:

<!-- HITL-GATE: transitions.validate-to-release | TRANSITION -->
@../_shared/transition-check.md

Next skill: `/release`
```

**Step 2: Verify**

Confirm `skills/validate/phases/3-checkpoint.md` handles FAIL before the transition check.

---

### Task 11: Full gate audit verification

**Wave:** 4
**Depends on:** Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9, Task 10

**Files:**
- (read-only verification — no files modified)

**Step 1: Count all HITL-GATE annotations**

Run: `grep -r "HITL-GATE" skills/`

Expected 14 total:
- `skills/design/phases/0-prime.md` — 1 (existing-design-choice)
- `skills/design/phases/1-execute.md` — 3 (gray-area-selection, gray-area-discussion, section-review)
- `skills/design/phases/2-validate.md` — 1 (design-approval)
- `skills/design/phases/3-checkpoint.md` — 1 (design-to-plan transition)
- `skills/plan/phases/2-validate.md` — 1 (plan-approval)
- `skills/plan/phases/3-checkpoint.md` — 1 (plan-to-implement transition)
- `skills/implement/phases/1-execute.md` — 2 (architectural-deviation, blocked-task-decision)
- `skills/implement/phases/2-validate.md` — 1 (validation-failure)
- `skills/implement/phases/3-checkpoint.md` — 1 (implement-to-validate transition)
- `skills/validate/phases/3-checkpoint.md` — 1 (validate-to-release transition)
- `skills/release/phases/1-execute.md` — 1 (version-confirmation)

**Step 2: Verify config.yaml completeness**

Read `.beastmode/config.yaml` and confirm:
- 10 gate IDs under `gates:` (5 design + 1 plan + 3 implement + 1 release)
- 4 transition IDs under `transitions:`
- `context_threshold` value present

**Step 3: Verify shared utilities exist**

Confirm both `skills/_shared/gate-check.md` and `skills/_shared/transition-check.md` exist and are non-empty.
