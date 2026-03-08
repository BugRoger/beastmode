# Design Execute Phase v2 Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Redesign the design execute phase from 8 steps to 5, replacing batch-question mechanics with conversational one-question-at-a-time flow.

**Architecture:** Rewrite `1-execute.md` to collapse scout + gray areas into a conversational intent step, add a dedicated approach-selection gate, and keep section review. Update config gate names and documentation to match.

**Tech Stack:** Markdown skill files, YAML configuration

**Design Doc:** `.beastmode/state/design/2026-03-08-design-execute-v2.md`

---

### Task 0: Rewrite 1-execute.md

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/design/phases/1-execute.md:1-114`

**Step 1: Read the current file**

Read `skills/design/phases/1-execute.md` to confirm current content matches expectations.

**Step 2: Replace the entire file content**

Write the new 5-step execute phase:

```markdown
# 1. Execute

## 1. Create Feature Worktree

**MANDATORY — do not skip this step.**

Derive `<feature>` from the user's topic using [worktree-manager.md](../_shared/worktree-manager.md) → "Derive Feature Name" (from user topic).

Then create the worktree using [worktree-manager.md](../_shared/worktree-manager.md) → "Create Worktree".

All subsequent work in this session MUST happen inside the worktree. If `cd` or `pwd` shows you are still in the main repo, STOP and fix it.

## 2. [GATE|design.intent-discussion]

Read `.beastmode/config.yaml` → resolve mode for `design.intent-discussion`.
Default: `human`.

### [GATE-OPTION|human] Conversational Intent + Gray Areas

**Phase A — Understand Intent:**

1. Ask "What are you trying to build?" (or derive from arguments if clear)
2. Follow-up questions one at a time, multiple choice preferred
3. Read code ON DEMAND as questions arise (replaces separate scout step)
4. Honor prior decisions from L2 context and L3 records
5. Build mental model of purpose, constraints, success criteria
6. Summarize understanding back to user for confirmation

**Phase B — Gray Area Loop:**

1. Analyze topic to find decisions that would change the outcome
2. Present the 3 most unclear areas + "Claude's Discretion" bucket + "Other"
   - Use `AskUserQuestion` with `multiSelect: true`
   - Annotate options with codebase context when relevant
3. User multi-selects which to discuss
4. Per selected area: one question at a time, multiple choice preferred
   - "You decide" option on every question (explicit discretion opt-in)
   - "Other" always available
   - Scope guardrail: new capabilities get deferred
     "That sounds like its own feature — I'll note it as a deferred idea. Back to [area]."
5. After batch resolved: "3 more areas, or satisfied with the level of detail?"
   - "3 more" → loop back with next 3 most unclear
   - "Satisfied" → exit loop
6. Track deferred ideas internally

### [GATE-OPTION|auto] Derive All Silently

- Derive intent from arguments + codebase scan
- Decide all gray areas based on context and prior decisions
- Log decisions inline
- No questions asked

## 3. [GATE|design.approach-selection]

Read `.beastmode/config.yaml` → resolve mode for `design.approach-selection`.
Default: `human`.

### [GATE-OPTION|human] Present Approaches

- Present 2-3 different approaches with trade-offs
- Lead with recommended option and explain why
- Annotate with codebase context: "Approach A reuses existing X"
- Informed by gray area decisions — don't re-ask decided points
- User picks

### [GATE-OPTION|auto] Claude Picks

- Select recommended approach
- Log rationale
- Proceed without asking

## 4. [GATE|design.section-review]

Read `.beastmode/config.yaml` → resolve mode for `design.section-review`.
Default: `human`.

### [GATE-OPTION|human] Section-by-Section Review

Once requirements understood:
- Scale each section to complexity
- Ask after each section if it looks right
- Cover: architecture, components, data flow, error handling, testing

### [GATE-OPTION|auto] Present Full Design

Present the full design without per-section approval pauses.
Proceed directly to validation.
Log: "Gate `design.section-review` → auto: full design presented"

## 5. Iterate Until Ready for Validation

- Go back and clarify as needed
- Keep YAGNI in mind — remove unnecessary features
- Design is ready when all sections covered
```

**Step 3: Verify the rewrite**

Read the file back and confirm:
- 5 steps total (worktree, intent-discussion gate, approach-selection gate, section-review gate, iterate)
- 3 gates: `design.intent-discussion`, `design.approach-selection`, `design.section-review`
- No references to "Scout Codebase" or "Identify Gray Areas" as separate steps
- "You decide" option documented for every question
- Deferred ideas list maintained
- One-question-at-a-time flow specified

### Task 1: Update config.yaml gate names

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/config.yaml:5-9`

**Step 1: Read the current config**

Read `.beastmode/config.yaml` to confirm current gate structure.

**Step 2: Replace old design gates with new ones**

Replace:
```yaml
  design:
    existing-design-choice: auto    # INTERACTIVE — prior design found, ask what to do
    gray-area-selection: human       # INTERACTIVE — which areas to discuss
    gray-area-discussion: human      # INTERACTIVE — question loop per area
    section-review: human            # INTERACTIVE — section-by-section review
    design-approval: human           # APPROVAL — approve before documenting
```

With:
```yaml
  design:
    existing-design-choice: auto    # INTERACTIVE — prior design found, ask what to do
    intent-discussion: human         # INTERACTIVE — conversational intent + gray area loop
    approach-selection: human        # INTERACTIVE — pick from proposed approaches
    section-review: human            # INTERACTIVE — section-by-section review
    design-approval: human           # APPROVAL — approve before documenting
```

**Step 3: Verify**

Read `.beastmode/config.yaml` and confirm:
- `gray-area-selection` and `gray-area-discussion` are gone
- `intent-discussion` and `approach-selection` are present
- `existing-design-choice`, `section-review`, and `design-approval` unchanged

### Task 2: Update docs/configurable-gates.md

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `docs/configurable-gates.md:38-56`
- Modify: `docs/configurable-gates.md:65-70`
- Modify: `docs/configurable-gates.md:91-106`
- Modify: `docs/configurable-gates.md:112-125`

**Step 1: Read the current docs file**

Read `docs/configurable-gates.md` in full.

**Step 2: Update the ASCII diagram (lines 38-56)**

Replace the gate diagram with:

```
 DESIGN        PLAN         IMPLEMENT      VALIDATE      RELEASE
 ──────        ────         ─────────      ────────      ───────
 |             |            |              |             |
 * intent      * plan       * deviation    |             * version
   discussion    approval     handling     |               confirm
 |             |            |              |             |
 * approach                 * blocked      |             * L0 update
   selection                  task         |               approval
 |                          |              |
 * section                  * validation   |
   review                     failure      |
 |                                         |
 * design                                  |
   approval                                |
 |             |            |              |             |
 └─── auto ────┘─── auto ──┘──── auto ────┘──── auto ──┘
      transition   transition    transition    transition
```

**Step 3: Update the Interactive gates description (lines 65-70)**

Replace:
```
**Interactive gates** control dialogue flow. The design phase's gray-area
discussion gate determines whether Claude asks clarifying questions or
makes reasonable assumptions. On `human`, you get a collaborative design
session. On `auto`, you get a design proposal.
```

With:
```
**Interactive gates** control dialogue flow. The design phase's intent-discussion
gate determines whether Claude asks clarifying questions one at a time or
derives intent silently from arguments and codebase. On `human`, you get a
conversational design session. On `auto`, you get a design proposal.
```

**Step 4: Update the "fresh project" YAML example (lines 91-106)**

Replace:
```yaml
gates:
  design:
    gray-area-selection: human
    gray-area-discussion: human
    section-review: human
    design-approval: human
```

With:
```yaml
gates:
  design:
    intent-discussion: human
    approach-selection: human
    section-review: human
    design-approval: human
```

**Step 5: Update the "after a few sessions" YAML example (lines 112-125)**

Replace:
```yaml
gates:
  design:
    gray-area-selection: human     # still want to choose what to discuss
    gray-area-discussion: human    # still want the dialogue
    section-review: auto           # trusting section-level output now
    design-approval: human         # still approving final designs
```

With:
```yaml
gates:
  design:
    intent-discussion: human       # still want the conversational flow
    approach-selection: human      # still want to pick the approach
    section-review: auto           # trusting section-level output now
    design-approval: human         # still approving final designs
```

**Step 6: Verify**

Search the file for any remaining references to `gray-area`. Expected: 0 matches.

### Task 3: Update README.md gate example

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `README.md:90-103`

**Step 1: Read README.md around the gate example**

Read `README.md` lines 88-106.

**Step 2: Replace the gate example**

Replace:
```yaml
# .beastmode/config.yaml
gates:
  design:
    gray-area-discussion: human   # start supervised
    design-approval: human
```

With:
```yaml
# .beastmode/config.yaml
gates:
  design:
    intent-discussion: human      # start supervised
    design-approval: human
```

**Step 3: Verify**

Search `README.md` for `gray-area`. Expected: 0 matches.
