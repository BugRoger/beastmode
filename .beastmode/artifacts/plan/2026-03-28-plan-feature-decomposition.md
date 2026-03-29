# plan-feature-decomposition Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Restructure /plan to decompose PRDs into independent feature plans, and /implement to self-generate task breakdowns from architectural descriptions.

**Architecture:** Plan outputs N architectural feature files + a manifest JSON. Implement reads one feature file, explores the codebase, creates its own detailed task breakdown, then dispatches. Validate gates on all features complete via manifest.

**Tech Stack:** Markdown, YAML, JSON, bash (git)

**Design Doc:** `.beastmode/state/design/2026-03-28-plan-feature-decomposition.md`

---

### Task 0: Update config.yaml with new plan gates

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `.beastmode/config.yaml:1-34`

**Step 1: Add new plan gates**

Replace the plan gates section with feature-set and feature-approval gates:

```yaml
  plan:
    feature-set-approval: human          # APPROVAL — approve the full set of features
    feature-approval: auto               # APPROVAL — approve each feature individually
```

**Verification:**

Read `.beastmode/config.yaml` — confirm both new gates present, old `plan-approval` removed.

---

### Task 1: Update plan SKILL.md description

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/SKILL.md:1-26`

**Step 1: Update skill description and phase descriptions**

```markdown
---
name: plan
description: Decompose PRDs into independent features — scoping, slicing, architectural decisions. Use after design. Creates feature plans from a PRD.
---

# /plan

Decompose a PRD into independent feature plans. Each feature is a vertical slice that can be implemented separately via /implement.

<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No EnterPlanMode or ExitPlanMode — this skill manages its own flow. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load context, read design doc
1. [Execute](phases/1-execute.md) — Identify architectural decisions, decompose into features
2. [Validate](phases/2-validate.md) — Coverage check, feature set approval
3. [Checkpoint](phases/3-checkpoint.md) — Save feature plans + manifest, suggest /implement
```

**Verification:**

Read `skills/plan/SKILL.md` — confirm updated description and phase summaries.

---

### Task 2: Rewrite plan execute phase

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 1

**Files:**
- Modify: `skills/plan/phases/1-execute.md:1-40`

**Step 1: Replace entire execute phase**

```markdown
# 1. Execute

## 1. Explore Codebase

Understand:
- Existing patterns, conventions, and architecture
- Module boundaries and interfaces
- Test structure and commands
- Dependencies and build tools

## 2. Identify Durable Architectural Decisions

Before slicing into features, identify high-level decisions that span the entire design and are unlikely to change during implementation:

- Route structures and API contracts
- Schema shapes and data models
- Authentication and authorization approach
- Service boundaries and module interfaces
- Shared infrastructure choices

These become cross-cutting constraints that every feature must honor.

## 3. Decompose PRD into Features

Break the PRD into thin vertical slices. Each feature cuts through all relevant layers end-to-end.

Rules:
1. Each feature should be independently implementable
2. Features should map to user stories from the PRD
3. Avoid deep dependencies between features where possible
4. If a decision can be answered by exploring the codebase, explore instead of asking
5. If a question requires research (unfamiliar technology, external APIs), research inline using Explore agent with `@../../agents/common-researcher.md` — save findings to `.beastmode/state/research/YYYY-MM-DD-<topic>.md`
6. Scope guardrail: new capabilities get deferred
   "That sounds like its own design — I'll note it as a deferred idea."
7. Track deferred ideas internally

For each feature, capture:
- **Name:** short slug (lowercase, hyphenated)
- **User Stories:** which PRD user stories this feature covers
- **What to Build:** architectural description of what needs to happen (no file paths or code)
- **Acceptance Criteria:** how to verify this feature is done

## 4. [GATE|plan.feature-set-approval]

Read `.beastmode/config.yaml` → resolve mode for `plan.feature-set-approval`.
Default: `human`.

### [GATE-OPTION|human] Quiz the User

Present all features as a summary table:

| # | Feature | User Stories | Description |
|---|---------|-------------|-------------|
| 1 | feature-slug | US 1, 3 | One-line summary |
| 2 | feature-slug | US 2, 4 | One-line summary |

Then ask:
- "Does the granularity feel right? Should any features merge or split?"
- Iterate until user approves the feature set

### [GATE-OPTION|auto] Self-Approve

Log: "Gate `plan.feature-set-approval` → auto: approved N features"

## 5. [GATE|plan.feature-approval]

Read `.beastmode/config.yaml` → resolve mode for `plan.feature-approval`.
Default: `auto`.

### [GATE-OPTION|human] Approve Each Feature

For each feature, present its full description (user stories, what to build, acceptance criteria) and ask:
- "Approve this feature plan?"
- Options: Approve / Revise [specify what]

### [GATE-OPTION|auto] Self-Approve

Log: "Gate `plan.feature-approval` → auto: approved all features"

## 6. Iterate Until Ready

- Refine features based on feedback
- Keep YAGNI in mind — remove unnecessary scope
- Features are ready when all have user stories, descriptions, and acceptance criteria
```

**Verification:**

Read `skills/plan/phases/1-execute.md` — confirm new structure with architectural decisions, feature decomposition, and two approval gates.

---

### Task 3: Create feature plan template reference

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Create: `skills/plan/references/feature-format.md`

**Step 1: Write the feature plan template reference**

````markdown
# Feature Plan Format

## Template

Each feature plan file follows this structure:

```markdown
# [Feature Name]

**Design:** [path to parent PRD]
**Architectural Decisions:** [path to manifest or "see manifest"]

## User Stories

[Numbered list of user stories this feature covers, copied from the PRD]

## What to Build

[Architectural description of what needs to happen. Describe modules, interfaces, and interactions. Do NOT include specific file paths or code — /implement will discover those via codebase exploration.]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion N]
```

## Guidelines

- **No file paths** — /implement explores the codebase and determines exact files
- **No code snippets** — /implement generates task-level code during decomposition
- **Architectural, not procedural** — describe WHAT, not step-by-step HOW
- **Self-contained** — each feature should be implementable without reading other feature plans
- **Linked** — always reference the parent PRD and shared architectural decisions
````

**Verification:**

Read `skills/plan/references/feature-format.md` — confirm template and guidelines present.

---

### Task 4: Rewrite plan validate phase

**Wave:** 3
**Parallel-safe:** true
**Depends on:** Task 2

**Files:**
- Modify: `skills/plan/phases/2-validate.md:1-74`

**Step 1: Replace validate phase with feature-oriented checks**

````markdown
# 2. Validate

## 1. PRD Coverage Check

Extract all user stories from the PRD. For each, verify it appears in at least one feature plan.

Print a coverage table:

```
PRD User Story                → Feature          Status
───────────────────────────────────────────────────────
US 1: Independent implement   → plan-rewrite     ✓
US 2: Per-feature implement   → impl-decompose   ✓
US 3: All-complete validate   → validate-gate    ✓
```

If any story shows `✗ MISSING`, go back to Execute phase and assign it to a feature or create a new one.

## 2. Feature Completeness Check

Verify every feature has:
- [ ] Name (slug format)
- [ ] At least one user story
- [ ] What to Build section (non-empty)
- [ ] At least one acceptance criterion
- [ ] Link to parent PRD

If incomplete, go back to Execute phase.

## 3. Overlap Analysis

Check for user stories that appear in multiple features. If found:
- If intentional (shared concern): note in both features
- If accidental: remove from one and re-verify coverage

Print summary:

```
Overlap Analysis
────────────────
US 1: plan-rewrite only
US 2: impl-decompose only
US 3: validate-gate, impl-decompose (shared — intentional)
```

## 4. Executive Summary

Present a consolidated view before approval:

```
### Feature Plan Summary

**Design:** [PRD path]

**Architectural Decisions:**
| Decision | Choice |
|----------|--------|
| [decision 1] | [choice] |

**Features:** [count] features covering [count] user stories

| # | Feature | Stories | Scope |
|---|---------|---------|-------|
| 1 | [slug]  | US 1, 3 | [one-line] |
| 2 | [slug]  | US 2    | [one-line] |
```

This is read-only — do NOT ask new questions here.

## 5. [GATE|plan.feature-set-approval]

This is the final approval gate. Read `.beastmode/config.yaml` → resolve mode for `plan.feature-set-approval`.
Default: `human`.

### [GATE-OPTION|human] User Approval

Ask: "Feature plans complete. Ready to save and proceed to implementation?"

Options:
- Yes, save and continue
- No, let's revise [specify what]

Wait for user response before continuing.

### [GATE-OPTION|auto] Self-Approve

Log: "Gate `plan.feature-set-approval` → auto: approved"
Proceed to checkpoint.
````

**Verification:**

Read `skills/plan/phases/2-validate.md` — confirm PRD coverage, completeness, overlap analysis, executive summary, and approval gate.

---

### Task 5: Rewrite plan checkpoint phase

**Wave:** 3
**Depends on:** Task 2, Task 3

**Files:**
- Modify: `skills/plan/phases/3-checkpoint.md:1-50`

**Step 1: Replace checkpoint to write feature files + manifest**

````markdown
# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Write Feature Plan Files

For each feature, save to `.beastmode/state/plan/YYYY-MM-DD-<design>-<feature-slug>.md` using the template from [feature-format.md](../references/feature-format.md).

Where `<design>` is the worktree directory name (from "Derive Feature Name") and `<feature-slug>` is the feature's name slug.

## 2. Write Manifest

Save to `.beastmode/state/plan/YYYY-MM-DD-<design>.manifest.json`:

```json
{
  "design": ".beastmode/state/design/YYYY-MM-DD-<design>.md",
  "architecturalDecisions": [
    {"decision": "<description>", "choice": "<choice>"}
  ],
  "features": [
    {
      "slug": "<feature-slug>",
      "plan": "YYYY-MM-DD-<design>-<feature-slug>.md",
      "status": "pending"
    }
  ],
  "lastUpdated": "<ISO-8601-timestamp>"
}
```

## 3. Phase Retro

@../_shared/retro.md

## 4. [GATE|transitions.plan-to-implement]

Read `.beastmode/config.yaml` → resolve mode for `transitions.plan-to-implement`.
Default: `human`.

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode.
</HARD-GATE>

### [GATE-OPTION|human] Suggest Next Step

Print features and their implement commands:

```
Features ready for implementation:

1. <feature-1> → `/beastmode:implement <design>-<feature-1>`
2. <feature-2> → `/beastmode:implement <design>-<feature-2>`
```

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:implement", args="<design>-<first-feature>")` for the first feature only. User runs subsequent features manually.
````

**Verification:**

Read `skills/plan/phases/3-checkpoint.md` — confirm feature file writes, manifest JSON, and per-feature transition output.

---

### Task 6: Update worktree-manager with Resolve Manifest

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `skills/_shared/worktree-manager.md:74-97`

**Step 1: Add Resolve Manifest section after Resolve Artifact**

Insert the following section after the existing "Resolve Artifact" section (after line 97), before "Create Worktree":

```markdown
## Resolve Manifest

Used by: `/implement` 0-prime (to find feature in manifest), `/validate` 0-prime (to check all features complete)

Finds the plan manifest for a design inside the worktree. MUST be called AFTER entering the worktree.

```bash
design="<design-name>"  # worktree directory name

# Convention: manifests are YYYY-MM-DD-<design>.manifest.json
matches=$(ls .beastmode/state/plan/*-$design.manifest.json 2>/dev/null)

if [ -z "$matches" ]; then
  echo "ERROR: No manifest found for design '$design'"
  echo "Expected: .beastmode/state/plan/*-$design.manifest.json"
  exit 1
fi

# If multiple, take latest
manifest=$(echo "$matches" | tail -1)
```

Report: "Resolved manifest: `$manifest`"
```

**Verification:**

Read `skills/_shared/worktree-manager.md` — confirm new "Resolve Manifest" section exists between "Resolve Artifact" and "Create Worktree".

---

### Task 7: Update implement prime phase

**Wave:** 3
**Depends on:** Task 6

**Files:**
- Modify: `skills/implement/phases/0-prime.md:1-59`

**Step 1: Replace implement prime to read feature plan from manifest + capture baseline**

```markdown
# 0. Prime

<HARD-GATE>
## 1. Discover and Enter Feature Worktree

1. **Discover Feature** — resolve feature name from arguments or filesystem scan via [worktree-manager.md](../_shared/worktree-manager.md). Do NOT search for similarly named worktrees or artifacts.
2. **Enter Worktree** — cd into the worktree and verify with pwd.

The resolved `feature` name is used for all artifact paths in this phase.

Note: the argument may be `<design>-<feature-slug>`. The worktree name is the design portion. Parse accordingly:
- If worktree exists for full argument → use it (backward compat)
- Otherwise, split on first `-` that separates design from feature slug
</HARD-GATE>

## 2. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 3. Load Project Context

Read (if they exist):
- `.beastmode/context/IMPLEMENT.md`
- `.beastmode/meta/IMPLEMENT.md`

Follow L2 convention paths (`context/implement/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 4. Resolve Feature Plan

1. Resolve the manifest using [worktree-manager.md](../_shared/worktree-manager.md) → "Resolve Manifest" with the design name (worktree directory name)
2. Read the manifest JSON
3. Find the feature entry matching the feature slug from the argument
4. Read the feature plan file referenced in the manifest
5. Read the `architecturalDecisions` from the manifest — these are constraints for implementation

If the feature's status in the manifest is already `completed`, print a warning and STOP.

## 5. Capture Baseline Snapshot

Before any implementation begins, capture the current state of changed files:

```bash
git diff --name-only HEAD > /tmp/beastmode-baseline-$(date +%s).txt
```

Store the baseline file list. Spec checks in execute will diff against this baseline to avoid flagging files from prior feature implementations.

## 6. Prepare Environment

    # Install dependencies if needed
    npm install  # or appropriate command from .beastmode/context/
```

**Verification:**

Read `skills/implement/phases/0-prime.md` — confirm manifest resolution, architectural decision loading, baseline snapshot, and backward-compatible feature argument parsing.

---

### Task 8: Update implement execute phase

**Wave:** 4
**Parallel-safe:** true
**Depends on:** Task 7

**Files:**
- Modify: `skills/implement/phases/1-execute.md:1-121`

**Step 1: Add Decompose step at top, update spec check baseline**

Replace entire execute phase with version that includes Decompose step, separated Parse Waves, and baseline-aware spec check. The full content is specified in the plan body above under "Task 8: Update implement execute phase".

Key changes:
- New "## 0. Decompose Feature into Tasks" section at top
- Parse Waves separated into its own "## 1. Parse Waves" section
- Wave Loop renumbered to "## 2. Wave Loop"
- Spec check (2.3) compares against baseline snapshot from prime
- Task persistence paths updated to `YYYY-MM-DD-<design>-<feature-slug>.tasks.json`
- All section numbers shifted accordingly

**Verification:**

Read `skills/implement/phases/1-execute.md` — confirm Decompose step at top, Parse Waves section, baseline-aware spec check, and renumbered sections.

---

### Task 9: Update implement checkpoint to update manifest

**Wave:** 4
**Depends on:** Task 7

**Files:**
- Modify: `skills/implement/phases/3-checkpoint.md:1-49`

**Step 1: Add manifest status update and conditional transition**

Replace entire checkpoint with version that updates manifest status and shows feature completion status in transition gate. The full content is specified in the plan body above under "Task 9: Update implement checkpoint to update manifest".

Key changes:
- New "## 2. Update Manifest Status" section after deviation log
- Deviation log paths updated to `YYYY-MM-DD-<design>-<feature-slug>-deviations.md`
- Transition gate shows feature status from manifest
- Auto transition routes to next pending feature OR validate if all complete

**Verification:**

Read `skills/implement/phases/3-checkpoint.md` — confirm manifest update step, feature status display, and conditional next-step routing.

---

### Task 10: Update validate prime to check manifest completion

**Wave:** 4
**Depends on:** Task 6

**Files:**
- Modify: `skills/validate/phases/0-prime.md:1-34`

**Step 1: Add manifest completion check**

Replace entire prime phase with version that includes manifest completion check before test strategy. The full content is specified in the plan body above under "Task 10: Update validate prime to check manifest completion".

Key changes:
- New "## 4. Check Feature Completion" section
- Blocks validation if any features are still pending
- Test strategy moved to "## 5. Identify Test Strategy"

**Verification:**

Read `skills/validate/phases/0-prime.md` — confirm manifest completion check at step 4, blocking on pending features, and test strategy at step 5.

---

### Task 11: Replace plan's task-format.md with redirect

**Wave:** 5
**Parallel-safe:** true
**Depends on:** Task 2

**Files:**
- Modify: `skills/plan/references/task-format.md:1-84`

**Step 1: Replace with redirect to implement**

```markdown
# Task Format Reference

> **Moved:** Detailed task format (waves, file lists, code steps) is now created by /implement during its Decompose step.
>
> See: `skills/implement/references/task-format.md` for the task format specification.
>
> /plan produces **feature plans** instead. See: [feature-format.md](feature-format.md) for the feature plan format.
```

**Verification:**

Read `skills/plan/references/task-format.md` — confirm redirect, no stale task format content.

---

### Task 12: Copy task-format.md to implement references

**Wave:** 5
**Depends on:** Task 11

**Files:**
- Create: `skills/implement/references/task-format.md`

**Step 1: Copy the original task format reference to implement**

Create `skills/implement/references/task-format.md` with the full original task format content (bite-sized granularity, task structure, wave rules, parallel-safe flag, remember section) plus an updated header:

```markdown
# Task Format Reference

> Used by /implement's Decompose step to create detailed task breakdowns from feature plans.

## Bite-Sized Granularity

Each step is one action (2-5 minutes):
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step

[... rest of original content from skills/plan/references/task-format.md unchanged ...]
```

**Verification:**

Read `skills/implement/references/task-format.md` — confirm full task format spec present with updated header.
