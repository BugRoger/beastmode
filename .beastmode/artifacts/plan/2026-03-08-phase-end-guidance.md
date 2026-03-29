# Phase End Guidance Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Ensure every phase ends with a single, copy-pasteable next-step command from the transition gate only — no duplicates from retro, context report, or sub-agents.

**Architecture:** Add a "Next Step" visual element spec to `visual-language.md`. Ban transition guidance from `retro.md`. Fix `context-report.md` to remove its transition bleed. Standardize all four checkpoint files to use the same inline-code format for transition output.

**Tech Stack:** Markdown skill files (no runtime code)

**Design Doc:** `.beastmode/state/design/2026-03-08-phase-end-guidance.md`

---

### Task 0: Add "Next Step" Element to Visual Language Spec

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/_shared/visual-language.md:144-153`

**Step 1: Add Next Step section after Handoff Guidance**

Append the following section after the existing "Handoff Guidance" section (after line 153):

```markdown
## Next Step

Transition gate output element. Printed as plain text AFTER the context report and handoff guidance.

### Rules

| Rule | Value |
|------|-------|
| Format | Inline code (single backticks) |
| Content | `/beastmode:<next-phase> <resolved-artifact-path>` |
| Placement | After context report code block and handoff guidance line |
| Authority | ONLY the transition gate in checkpoint phases may produce this element |
| Auto/low-context prefix | `Start a new session and run:` on the line before the inline code |

**DO NOT** print next-step commands from retro, context report, sub-agents, or any other source.
**DO NOT** wrap in a code block — use single backticks (inline code) only.
**DO NOT** add surrounding prose, explanation, or alternatives alongside the command.

### Correct Examples

Human mode:
```
Next: `/beastmode:plan .beastmode/state/design/2026-03-08-feature-name.md`
```

Auto mode, low context:
```
Start a new session and run:

`/beastmode:plan .beastmode/state/design/2026-03-08-feature-name.md`
```
```

**Step 2: Verify**

Read the file back and confirm the new section exists at the end, after "Handoff Guidance". Confirm no other sections were altered.

---

### Task 1: Ban Transition Guidance from Retro

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/retro.md:1-5`

**Step 1: Add ban instruction after the title**

Insert the following immediately after the first heading (line 1 `# Phase Retro`) and before line 3 (`Review this phase's work...`):

```markdown
> **NEVER** print next-step commands, transition guidance, or session-restart instructions. The transition gate in the checkpoint phase handles this exclusively.
```

So lines 1-5 become:

```markdown
# Phase Retro

> **NEVER** print next-step commands, transition guidance, or session-restart instructions. The transition gate in the checkpoint phase handles this exclusively.

Review this phase's work for context doc accuracy and meta learnings.
```

**Step 2: Verify**

Read the file back. Confirm the blockquote appears between the title and the description. Confirm no other content was changed.

---

### Task 2: Remove Transition Bleed from Context Report

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/context-report.md:14`

**Step 1: Fix handoff guidance description**

Replace line 14:
```
3. **Handoff guidance** — based on context percentage, recommend continue or new session with the appropriate next command
```

With:
```
3. **Handoff guidance** — one of the three exact handoff strings from visual-language.md, based on context percentage
```

**Step 2: Add separation note**

Append after the last line:

```markdown

> **DO NOT** include next-step commands, transition guidance, or session-restart instructions in the context report. The transition gate handles what to do next. The context report only describes context state.
```

**Step 3: Verify**

Read the file back. Confirm the handoff guidance line no longer mentions "next command" and the separation note exists at the end.

---

### Task 3: Standardize Design Checkpoint Transition Gate

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md:37-58`

**Step 1: Rewrite the transition gate section**

Replace the `## 5. [GATE|transitions.design-to-plan]` section (lines 37-58) with:

```markdown
## 5. [GATE|transitions.design-to-plan]

Read `.beastmode/config.yaml` → resolve mode for `transitions.design-to-plan`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:plan .beastmode/state/design/YYYY-MM-DD-<topic>.md`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:plan", args=".beastmode/state/design/YYYY-MM-DD-<topic>.md")`

If below threshold, print:

Start a new session and run:

`/beastmode:plan .beastmode/state/design/YYYY-MM-DD-<topic>.md`

STOP. No additional output.
```

**Step 2: Verify**

Read the file back. Confirm the human mode uses `Next:` prefix with inline code. Confirm the auto/low-context mode uses `Start a new session and run:` prefix. Confirm STOP appears after both outputs.

---

### Task 4: Standardize Plan Checkpoint Transition Gate

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/plan/phases/3-checkpoint.md:30-50`

**Step 1: Rewrite the transition gate section**

Replace the `## 5. [GATE|transitions.plan-to-implement]` section (lines 30-50) with:

```markdown
## 5. [GATE|transitions.plan-to-implement]

Read `.beastmode/config.yaml` → resolve mode for `transitions.plan-to-implement`.
Default: `human`.

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode.
</HARD-GATE>

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:implement .beastmode/state/plan/YYYY-MM-DD-<feature-name>.md`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:implement", args=".beastmode/state/plan/YYYY-MM-DD-<feature-name>.md")`

If below threshold, print:

Start a new session and run:

`/beastmode:implement .beastmode/state/plan/YYYY-MM-DD-<feature-name>.md`

STOP. No additional output.
```

**Step 2: Verify**

Read the file back. Confirm format matches design spec. Confirm HARD-GATE preserved. Confirm STOP after both outputs.

---

### Task 5: Standardize Implement Checkpoint Transition Gate

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/implement/phases/3-checkpoint.md:33-49`

**Step 1: Rewrite the transition gate section**

Replace the `## 4. [GATE|transitions.implement-to-validate]` section (lines 33-49) with:

```markdown
## 4. [GATE|transitions.implement-to-validate]

Read `.beastmode/config.yaml` → resolve mode for `transitions.implement-to-validate`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:validate .beastmode/state/plan/YYYY-MM-DD-<feature>.md`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:validate", args=".beastmode/state/plan/YYYY-MM-DD-<feature>.md")`

If below threshold, print:

Start a new session and run:

`/beastmode:validate .beastmode/state/plan/YYYY-MM-DD-<feature>.md`

STOP. No additional output.
```

**Step 2: Verify**

Read the file back. Confirm format matches. Confirm gate number is `## 4.` (not `## 5.`). Confirm STOP after both outputs.

---

### Task 6: Standardize Validate Checkpoint Transition Gate

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/validate/phases/3-checkpoint.md:15-40`

**Step 1: Rewrite the transition gate section**

Replace the `## 4. [GATE|transitions.validate-to-release]` section (lines 15-40) with:

```markdown
## 4. [GATE|transitions.validate-to-release]

If FAIL:
```
Validation failed. Fix issues and re-run:
`/beastmode:validate`
```
STOP — do not proceed to transition check.

If PASS:

Read `.beastmode/config.yaml` → resolve mode for `transitions.validate-to-release`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:release .beastmode/state/plan/YYYY-MM-DD-<feature>.md`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:release", args=".beastmode/state/plan/YYYY-MM-DD-<feature>.md")`

If below threshold, print:

Start a new session and run:

`/beastmode:release .beastmode/state/plan/YYYY-MM-DD-<feature>.md`

STOP. No additional output.
```

**Step 2: Verify**

Read the file back. Confirm FAIL case preserved. Confirm PASS case uses standard format. Confirm STOP after both outputs. Confirm validate uses plan artifact path (consistent with implement).
