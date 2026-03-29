# Design PRD Rework Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Reshape the /design phase to produce PRDs through a two-pass decision-tree interview with inline codebase/research exploration.

**Architecture:** Replace the current gray-area-first interview loop with a two-pass flow (decision tree walk → gray area sweep → module sketch → PRD write). Replace 5 old design gates with 4 new ones. Update validate to check PRD sections instead of design doc sections.

**Tech Stack:** Markdown skill definitions, YAML config

**Design Doc:** `.beastmode/state/design/2026-03-28-design-prd-rework.md`

---

### Task 0: Update SKILL.md description and phase labels

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/design/SKILL.md:1-26`

**Step 1: Update the SKILL.md frontmatter and body**

```markdown
---
name: design
description: Create PRDs through structured decision-tree interviews — designing, speccing, scoping. Walks every branch of the design tree, sweeps for gray areas, sketches modules, writes a PRD.
---

# /design

Create PRDs through structured decision-tree interviews and collaborative dialogue.

<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No implementation until PRD is approved. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load context, check prior decisions
1. [Execute](phases/1-execute.md) — Decision tree walk, gray areas, module sketch
2. [Validate](phases/2-validate.md) — PRD completeness check, user approval
3. [Checkpoint](phases/3-checkpoint.md) — Save PRD, update status, suggest /plan
```

**Step 2: Verify**

Read `skills/design/SKILL.md` and confirm frontmatter description mentions PRD and phase labels match the new flow.

---

### Task 1: Rewrite 0-prime.md — simplified prime with prior decisions gate

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/design/phases/0-prime.md:1-59`

**Step 1: Replace entire file content**

```markdown
# 0. Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 2. Load Project Context

Read (if they exist):
- `.beastmode/context/DESIGN.md`
- `.beastmode/meta/DESIGN.md`

Follow L2 convention paths (`context/design/{domain}.md`) when relevant to the current topic.

## 3. [GATE|design.prior-decisions]

Read `.beastmode/config.yaml` → resolve mode for `design.prior-decisions`.
Default: `auto`.

Collect prior decisions from context/meta docs that are relevant to the current topic.

### [GATE-OPTION|human] Present Prior Decisions

If prior decisions were found:
- Present each as a one-liner with source reference
- Ask: "These prior decisions apply. Accept all, or review individually?"
- Options: Accept all / Review individually / Ignore all

### [GATE-OPTION|auto] Apply Silently

Apply all relevant prior decisions as constraints for the interview.
Log: "Gate `design.prior-decisions` → auto: applied {N} prior decisions"

## 4. Express Path Check

If arguments point to an existing PRD, spec, or requirements document (not a `.beastmode/state/design/` file):
1. Read the document
2. Skip decision tree walk in execute
3. Jump directly to "Module Sketch" with the doc as input

## 5. [GATE|design.existing-design-choice]

Read `.beastmode/config.yaml` → resolve mode for `design.existing-design-choice`.
Default: `human`.

### [GATE-OPTION|human] Ask User

If a prior design doc exists for the same topic (matching feature name):
- Ask: "Found existing PRD for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh

### [GATE-OPTION|auto] Claude Decides

Read the existing design and decide whether to update or start fresh based on how different the new requirements are.
Log: "Gate `design.existing-design-choice` → auto: <decision>"
```

**Step 2: Verify**

Read `skills/design/phases/0-prime.md` and confirm:
- Research trigger removed
- Prior decisions gate present with human/auto options
- Express path jumps to module sketch instead of "Propose Approaches"

---

### Task 2: Rewrite 1-execute.md — two-pass interview with module sketch

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/design/phases/1-execute.md:1-85`

**Step 1: Replace entire file content**

```markdown
# 1. Execute

## 1. [GATE|design.decision-tree]

Read `.beastmode/config.yaml` → resolve mode for `design.decision-tree`.
Default: `human`.

### [GATE-OPTION|human] Walk the Decision Tree

Interview the user about every aspect of this feature. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

Rules:
1. Ask questions one at a time
2. For each question, provide your recommended answer
3. If a question can be answered by exploring the codebase, explore the codebase instead of asking
4. If a question requires research (unfamiliar technology, external APIs, best practices), research inline using Explore agent with `@../../agents/common-researcher.md` — save findings to `.beastmode/state/research/YYYY-MM-DD-<topic>.md`
5. Honor prior decisions from prime — don't re-ask settled questions
6. Scope guardrail: new capabilities get deferred
   "That sounds like its own feature — I'll note it as a deferred idea. Back to the current branch."
7. Track deferred ideas internally
8. Continue until all branches of the decision tree are resolved

### [GATE-OPTION|auto] Derive All Silently

- Derive all decisions from arguments + codebase scan + prior decisions
- Research inline when needed
- Log decisions inline
- No questions asked

## 2. [GATE|design.gray-areas]

Read `.beastmode/config.yaml` → resolve mode for `design.gray-areas`.
Default: `human`.

### [GATE-OPTION|human] Gray Area Sweep

Second pass to catch big-picture blind spots the decision tree may have missed.

1. Step back and analyze the full picture for decisions that would change the outcome
2. Present the 3 most unclear areas + "Other"
   - Use `AskUserQuestion` with `multiSelect: true`
   - Annotate options with codebase context when relevant
3. User multi-selects which to discuss
4. Per selected area: one question at a time, recommendation included
   - "You decide" option on every question (explicit discretion opt-in)
   - "Other" always available
   - Scope guardrail: defer new capabilities
5. After batch resolved: "3 more areas, or satisfied with the level of detail?"
   - "3 more" → loop back with next 3 most unclear
   - "Satisfied" → exit loop

### [GATE-OPTION|auto] Self-Check

- Review decisions for internal consistency
- Flag obvious gaps
- Log: "Gate `design.gray-areas` → auto: {N} areas checked, {N} gaps found"

## 3. Module Sketch

Sketch out the major modules that will need to be built or modified.

1. List each module with a one-sentence description
2. Actively look for opportunities to extract **deep modules** — modules that encapsulate a lot of functionality behind a simple, testable interface that rarely changes
3. For each module, note whether it's new or a modification of existing code
4. Check with user (if gate mode is human) that modules match expectations

A deep module (as opposed to a shallow module) is one which encapsulates a lot of functionality in a simple, testable interface which rarely changes.

## 4. Iterate Until Ready for Validation

- Go back and clarify as needed
- Keep YAGNI in mind — remove unnecessary features
- PRD is ready when decision tree + gray areas + modules are all resolved
```

**Step 2: Verify**

Read `skills/design/phases/1-execute.md` and confirm:
- Two gates: `design.decision-tree` and `design.gray-areas`
- Decision tree walk has inline codebase exploration and research
- Gray area sweep as second pass
- Module sketch step after gray areas
- Old gates (`intent-discussion`, `approach-selection`, `section-review`) gone

---

### Task 3: Rewrite 2-validate.md — PRD section completeness

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/design/phases/2-validate.md:1-75`

**Step 1: Replace entire file content**

```markdown
# 2. Validate

## 1. Completeness Check

Verify PRD covers all required sections:
- [ ] Problem Statement
- [ ] Solution
- [ ] User Stories (3+ items)
- [ ] Implementation Decisions
- [ ] Testing Decisions
- [ ] Out of Scope
- [ ] Further Notes (or "none")
- [ ] Deferred ideas captured (or "none")

If missing sections, go back to Execute phase.

## 2. Anti-Pattern Check

If the PRD produced fewer than 3 user stories, print:

"This is a lightweight PRD — that's fine. Even simple features benefit from explicit approval to prevent wasted implementation."

Do NOT skip approval. Short PRDs still need the gate.

## 3. Executive Summary

Before asking for approval, present a consolidated executive summary so the user can review the full picture in one place.

Print:

```
### Executive Summary

**Problem**: [one-sentence problem statement]

**Solution**: [one-sentence solution summary]

**Key Decisions:**

| Decision | Choice |
|----------|--------|
| [decision 1] | [choice] |
| [decision 2] | [choice] |
| ... | ... |

**Modules:**
- [module 1] — [one-sentence description]
- [module 2] — [one-sentence description]

**User Stories:** [count] stories covering [summary of scope]
```

Render this from the decisions, modules, and stories gathered during the execute phase. Do NOT ask new questions — this is a read-only summary of what was already discussed.

## 4. [GATE|design.prd-approval]

Read `.beastmode/config.yaml` → resolve mode for `design.prd-approval`.
Default: `human`.

### [GATE-OPTION|human] User Approval

Ask: "Does this PRD look complete? Ready to document?"

Options:
- Yes, document it
- No, let's revise [specify what]

Wait for user response before continuing.

### [GATE-OPTION|auto] Self-Approve

Log: "Gate `design.prd-approval` → auto: approved"
Proceed to checkpoint.
```

**Step 2: Verify**

Read `skills/design/phases/2-validate.md` and confirm:
- Checklist maps to PRD sections
- Anti-pattern threshold is 3 user stories
- Executive summary includes modules
- Gate is `design.prd-approval` not `design.design-approval`

---

### Task 4: Update 3-checkpoint.md — write PRD instead of design doc

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md:1-58`

**Step 1: Replace entire file content**

```markdown
# 3. Checkpoint

<HARD-GATE>
## 0. Create Feature Worktree

1. **Derive Feature** — from the resolved topic using [worktree-manager.md](../_shared/worktree-manager.md) → "Derive Feature Name".
2. **Create Worktree** — using [worktree-manager.md](../_shared/worktree-manager.md) → "Create Worktree".

All subsequent work MUST happen inside the worktree.
</HARD-GATE>

## 1. Write PRD

Save to `.beastmode/state/design/YYYY-MM-DD-<feature>.md` where `<feature>` is the worktree directory name (from "Derive Feature Name").

Use this template:

```
## Problem Statement

[The problem from the user's perspective]

## Solution

[The solution from the user's perspective]

## User Stories

[Numbered list of user stories in format: As an <actor>, I want a <feature>, so that <benefit>]

## Implementation Decisions

[Flat list of implementation decisions made during the interview. Include:
- Modules that will be built/modified
- Interfaces that will be modified
- Technical clarifications
- Architectural decisions
- Schema changes, API contracts, specific interactions

Do NOT include specific file paths or code snippets — they may become outdated.]

## Testing Decisions

[Include:
- What makes a good test for this feature
- Which modules will be tested
- Prior art for tests (similar test patterns in the codebase)]

## Out of Scope

[Things explicitly excluded from this PRD]

## Further Notes

[Additional context, or "None"]

## Deferred Ideas

[Ideas that came up during the interview but were deferred as separate features, or "None"]
```

## 2. Phase Retro

@../_shared/retro.md

## 3. [GATE|transitions.design-to-plan]

Read `.beastmode/config.yaml` → resolve mode for `transitions.design-to-plan`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:plan <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:plan", args="<feature>")`
```

**Step 2: Verify**

Read `skills/design/phases/3-checkpoint.md` and confirm:
- "Write PRD" not "Write Design Doc"
- PRD template matches Matt's structure plus Deferred Ideas
- No "Extract Acceptance Criteria" step (user stories serve that purpose)
- Retro and transition gate unchanged

---

### Task 5: Update config.yaml — replace old design gates with new ones

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2, Task 3, Task 4

**Files:**
- Modify: `.beastmode/config.yaml:5-10`

**Step 1: Replace design gate section**

Replace lines 5-10:

```yaml
  design:
    existing-design-choice: human     # INTERACTIVE — prior design found, ask what to do
    intent-discussion: human         # INTERACTIVE — conversational intent + gray area loop
    approach-selection: human        # INTERACTIVE — pick from proposed approaches
    section-review: human            # INTERACTIVE — section-by-section review
    design-approval: human           # APPROVAL — approve before documenting
```

With:

```yaml
  design:
    existing-design-choice: human     # INTERACTIVE — prior PRD found, ask what to do
    prior-decisions: auto             # INTERACTIVE — apply prior decisions from context/meta
    decision-tree: human              # INTERACTIVE — walk every branch of the design tree
    gray-areas: human                 # INTERACTIVE — second pass for big-picture blind spots
    prd-approval: human               # APPROVAL — approve before documenting
```

**Step 2: Verify**

Read `.beastmode/config.yaml` and confirm:
- Old gates (`intent-discussion`, `approach-selection`, `section-review`, `design-approval`) removed
- New gates (`prior-decisions`, `decision-tree`, `gray-areas`, `prd-approval`) present
- `existing-design-choice` kept (still used in prime)
- All other gate sections (plan, implement, retro, release, transitions) untouched

---

### Task 6: Update constraints.md — PRD references

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/design/references/constraints.md:1-29`

**Step 1: Replace entire file content**

```markdown
# Design Constraints

## No Implementation Until Approval

Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a PRD and the user has approved it.

This applies to EVERY project regardless of perceived simplicity.

## Why This Matters

- "Simple" projects are where unexamined assumptions cause the most wasted work
- The PRD can be short (a few sentences for truly simple projects)
- You MUST present it and get approval before proceeding

## No Plan Mode

**You MUST NOT call `EnterPlanMode` or `ExitPlanMode` during this skill.** This skill operates in normal mode. Plan mode restricts Write/Edit tools. Use the /plan skill for structured planning instead.

## Anti-Pattern: "Too Simple for a PRD"

Every feature goes through this process. A config change, a single-function utility, a rename — all of them. "Simple" features are where unexamined assumptions cause the most wasted work.

The PRD can be short (a few user stories), but you MUST:
1. Walk at least one branch of the decision tree
2. Present it for approval
3. Write the PRD

There is no "skip design" path.
```

**Step 2: Verify**

Read `skills/design/references/constraints.md` and confirm all references to "design doc" replaced with "PRD".

---
