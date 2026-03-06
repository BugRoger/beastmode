# Skill Cleanup Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Standardize all skill files with consistent patterns for persona, imports, gates, task runner placement, context loading, and research flow.

**Architecture:** 7 design components grouped into 9 tasks by file isolation. Wave 1 updates shared infrastructure (task-runner, retro, SKILL.md templates). Wave 2 applies per-skill phase file changes in parallel (5 independent skill bundles). Wave 3 updates documentation.

**Tech Stack:** Markdown files only. No runtime dependencies.

**Design Doc:** [skill-cleanup](../design/2026-03-06-skill-cleanup.md)

---

### Task 0: Task Runner Gate Detection Update

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/task-runner.md`

**Step 1: Update gate detection pattern**

In the Execute Loop (## 3), replace lines 54-65 with updated gate detection. The config lookup path and mode resolution are unchanged — only the pattern matching and child task format change.

Old (lines 54-65):
```
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

New:
```
  # --- Gate detection ---
  IF task.content matches pattern "[GATE|<gate-id>]":
    Read `.beastmode/config.yaml`
    Look up gate-id:
      - If gate-id starts with "transitions." → check under `transitions:` key
      - Otherwise → check under `gates:` key (e.g., "design.design-approval" → gates.design.design-approval)
    Resolve mode: config value, or "human" if config missing or key not found
    Find child tasks — each has a [GATE-OPTION|mode] label
    Remove all children whose [GATE-OPTION|mode] does NOT match the resolved mode
    Set the surviving child to "in_progress"
    Update TodoWrite
    CONTINUE LOOP (surviving child executes, parent completes when child done)
```

**Step 2: Verify**

```bash
grep "GATE|" skills/_shared/task-runner.md       # Should match [GATE| and [GATE-OPTION|
grep "Gate:" skills/_shared/task-runner.md        # Should return 0
grep '"human —' skills/_shared/task-runner.md     # Should return 0
```

---

### Task 1: Retro.md Gate Syntax Migration

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/retro.md`

**Step 1: Migrate gate at line 64 (retro.learnings)**

Old:
```markdown
## 5. Gate: retro.learnings

Read `.beastmode/config.yaml` → check `gates.retro.learnings`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 5.1 human — Review Learnings
```

New:
```markdown
## 5. [GATE|retro.learnings]

Read `.beastmode/config.yaml` → resolve mode for `retro.learnings`.
Default: `human`.

### [GATE-OPTION|human] Review Learnings
```

**Step 2: Migrate gate at line 79 (retro.sops)**

Same pattern — `Gate: retro.sops` → `[GATE|retro.sops]`. Replace numbered sub-options `6.1 human —` / `6.2 auto —` with `[GATE-OPTION|human]` / `[GATE-OPTION|auto]`. Drop "Execute ONLY..." and "Remove non-matching..." lines.

**Step 3: Migrate gate at line 96 (retro.overrides)**

Same pattern — `Gate: retro.overrides` → `[GATE|retro.overrides]`.

**Step 4: Migrate gate at line 111 (retro.context-changes)**

Same pattern — `Gate: retro.context-changes` → `[GATE|retro.context-changes]`.

**Step 5: Verify**

```bash
grep "\[GATE|" skills/_shared/retro.md           # Should find 4 gates
grep "\[GATE-OPTION|" skills/_shared/retro.md    # Should find 8 options
grep "Gate:" skills/_shared/retro.md             # Should return 0
grep "Execute ONLY" skills/_shared/retro.md      # Should return 0
```

---

### Task 2: SKILL.md Template Update

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/design/SKILL.md`
- Modify: `skills/plan/SKILL.md`
- Modify: `skills/implement/SKILL.md`
- Modify: `skills/validate/SKILL.md`
- Modify: `skills/release/SKILL.md`
- Modify: `skills/status/SKILL.md`

**Step 1: Update design/SKILL.md**

Current HARD-GATE (lines 10-12):
```markdown
<HARD-GATE>
No implementation until design is approved. [→ Why](references/constraints.md)
</HARD-GATE>
```

New:
```markdown
<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.

No implementation until design is approved. [→ Why](references/constraints.md)
</HARD-GATE>
```

Remove line 21: `@_shared/task-runner.md`

**Step 2: Update plan/SKILL.md**

Add task-runner line as first line inside HARD-GATE. Remove line 21.

Current:
```markdown
<HARD-GATE>
No EnterPlanMode or ExitPlanMode — this skill manages its own flow. [→ Why](references/constraints.md)
</HARD-GATE>
```

New:
```markdown
<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.

No EnterPlanMode or ExitPlanMode — this skill manages its own flow. [→ Why](references/constraints.md)
</HARD-GATE>
```

**Step 3: Update implement/SKILL.md**

Same pattern. Add task-runner first line. Remove trailing import.

**Step 4: Update validate/SKILL.md**

Same pattern. Add task-runner first line. Remove trailing import.

**Step 5: Update release/SKILL.md**

Currently has NO HARD-GATE block. Add one:

```markdown
<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.
</HARD-GATE>
```

Insert after the one-sentence overview (after line 8), before `## Phases`. Remove line 17: `@_shared/task-runner.md`.

**Step 6: Update status/SKILL.md**

Currently has no HARD-GATE. Add one:

```markdown
<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.
</HARD-GATE>
```

Insert after `**Usage:**` block (after line 14), before `## Phases`. Remove line 19: `@_shared/task-runner.md`.

**Step 7: Verify**

```bash
# Task runner in HARD-GATE for all 6
for f in skills/*/SKILL.md; do echo "=== $f ==="; grep -A1 "HARD-GATE>" "$f" | head -2; done

# No trailing task-runner imports
for f in skills/*/SKILL.md; do tail -3 "$f"; done | grep "task-runner"  # Should return 0
```

---

### Task 3: Design Skill Phase Files

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/design/phases/0-prime.md`
- Modify: `skills/design/phases/1-execute.md`
- Modify: `skills/design/phases/2-validate.md`
- Modify: `skills/design/phases/3-checkpoint.md`

**Step 1: Overhaul 0-prime.md**

Rewrite the entire file. Current file has 7 steps; new file has 5 steps.

New content for `skills/design/phases/0-prime.md`:
```markdown
# 0. Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/DESIGN.md`
- `.beastmode/meta/DESIGN.md`

Follow links in these L1 files to L2 details when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 3. Check Research Trigger

Research triggers if ANY:

**Keyword Detection** — arguments contain:
- "research", "investigate", "explore first"
- "what's SOTA", "best practices", "how do people"

**Complexity Assessment** — topic involves:
- Unfamiliar technology or domain
- External API/service integration
- User expresses uncertainty

If triggered:
1. Extract topic from arguments
2. Spawn Explore agent with `@../../agents/researcher.md`
3. Save findings to `.beastmode/state/research/YYYY-MM-DD-<topic>.md`
4. Summarize findings to user and continue to next step

## 4. Express Path Check

If arguments point to an existing PRD, spec, or requirements document (not a `.beastmode/state/design/` file):
1. Read the document
2. Skip gray area identification in execute
3. Jump directly to "Propose Approaches" with the doc as input

## 5. [GATE|design.existing-design-choice]

Read `.beastmode/config.yaml` → resolve mode for `design.existing-design-choice`.
Default: `human`.

### [GATE-OPTION|human] Ask User

If a prior design doc exists for the same topic (matching feature name):
- Ask: "Found existing design for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh

### [GATE-OPTION|auto] Claude Decides

Read the existing design and decide whether to update or start fresh based on how different the new requirements are.
Log: "Gate `design.existing-design-choice` → auto: <decision>"
```

Changes from current:
- Step 1: Remove "Announce that you're starting /design in persona voice." → standardized announce text
- Step 2: Deleted "Role Clarity" entirely
- Step 3 (was 3): Added L1 link-following instruction and "don't re-decide" line
- Step 3 (was 5): Research trigger step 4 now says "and continue to next step"
- Step 4 (was 4): "Load Prior Decisions" deleted — L1 link-following covers this
- Step 5 (was 7): Gate migrated to new `[GATE|...]` syntax, renumbered from 7 to 5

**Step 2: Migrate gates in 1-execute.md**

3 gates to migrate. For each, apply the same pattern transformation.

Line 43 — `## 4. Gate: design.gray-area-selection`:
```markdown
## 4. [GATE|design.gray-area-selection]

Read `.beastmode/config.yaml` → resolve mode for `design.gray-area-selection`.
Default: `human`.

### [GATE-OPTION|human] Interactive Selection
...
### [GATE-OPTION|auto] Select All
...
```

Line 67 — `## 5. Gate: design.gray-area-discussion`:
Same transformation. Drop numbered sub-options, use `[GATE-OPTION|mode]` labels.

Line 100 — `## 7. Gate: design.section-review`:
Same transformation.

Also fix prose @ reference at line 18:
- Old: `See @../_shared/worktree-manager.md for full reference.`
- New: `See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.`

Drop "Execute ONLY the matching option below. Remove non-matching options from the task list." from all 3 gates.

**Step 3: Migrate gate in 2-validate.md**

Line 56 — `## 4. Gate: design.design-approval`:
Same gate syntax transformation.

**Step 4: Migrate gate in 3-checkpoint.md**

Line 37 — `## 5. Gate: transitions.design-to-plan`:
Same gate syntax transformation.

**Step 5: Verify**

```bash
grep "\[GATE|" skills/design/phases/*.md           # Should find 5 gates
grep "\[GATE-OPTION|" skills/design/phases/*.md    # Should find 10 options
grep "Gate:" skills/design/phases/*.md             # Should return 0
grep "Role Clarity" skills/design/phases/*.md      # Should return 0
grep "Prior Decisions" skills/design/phases/*.md   # Should return 0
grep "See @" skills/design/phases/*.md             # Should return 0
grep "Execute ONLY" skills/design/phases/*.md      # Should return 0
```

---

### Task 4: Plan Skill Phase Files

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/plan/phases/0-prime.md`
- Modify: `skills/plan/phases/2-validate.md`
- Modify: `skills/plan/phases/3-checkpoint.md`

**Step 1: Overhaul 0-prime.md**

New content for `skills/plan/phases/0-prime.md`:
```markdown
# 0. Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/PLAN.md`
- `.beastmode/meta/PLAN.md`

Follow links in these L1 files to L2 details when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 3. Check Research Trigger

Research triggers if ANY:
- Arguments contain research keywords
- Design references unfamiliar technology
- Complex integration required

If triggered, spawn Explore agent, save findings, summarize to user and continue to next step.

## 4. Read Design Document

Read the design doc from arguments (e.g., `.beastmode/state/design/YYYY-MM-DD-<topic>.md`).

## 5. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Resolve the feature name and enter the worktree:

1. If arguments contain a state file path → extract feature name from filename (strip date prefix and `.md`)
2. If no arguments → scan `.beastmode/worktrees/` for directories:
   - Exactly one → use it automatically
   - Multiple → list with branch names, ask user to pick via `AskUserQuestion`
   - Zero → print: "No active worktrees found. Run /design to start a new feature, or provide a state file path as argument." and STOP
3. Enter the worktree:

\`\`\`bash
worktree_path=".beastmode/worktrees/$feature"
if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi
cd "$worktree_path"
pwd  # confirm you are in the worktree
\`\`\`

See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.
```

Changes:
- Step 1: Standardized announce text
- Step 2: Added L1 link-following instruction
- Step 3: Research trigger now says "summarize to user and continue to next step"
- Step 5: Prose `@` reference → markdown link

**Step 2: Migrate gate in 2-validate.md (line 55)**

`## 4. Gate: plan.plan-approval` → `## 4. [GATE|plan.plan-approval]`

Apply standard gate syntax transformation. Drop "Execute ONLY..." line.

**Step 3: Migrate gate in 3-checkpoint.md (line 30)**

`## 5. Gate: transitions.plan-to-implement` → `## 5. [GATE|transitions.plan-to-implement]`

Apply standard gate syntax transformation.

**Step 4: Verify**

```bash
grep "\[GATE|" skills/plan/phases/*.md           # Should find 2 gates
grep "\[GATE-OPTION|" skills/plan/phases/*.md    # Should find 4 options
grep "Gate:" skills/plan/phases/*.md             # Should return 0
grep "See @" skills/plan/phases/*.md             # Should return 0
grep "Execute ONLY" skills/plan/phases/*.md      # Should return 0
```

---

### Task 5: Implement Skill Phase Files

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/implement/phases/0-prime.md`
- Modify: `skills/implement/phases/1-execute.md`
- Modify: `skills/implement/phases/2-validate.md`
- Modify: `skills/implement/phases/3-checkpoint.md`

**Step 1: Overhaul 0-prime.md**

Update step 1 (announce) to standardized text. Update step 2 (context) to add L1 link-following instruction:

```markdown
## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/IMPLEMENT.md`
- `.beastmode/meta/IMPLEMENT.md`

Follow links in these L1 files to L2 details when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.
```

Fix prose @ reference at line 41:
- Old: `See @../_shared/worktree-manager.md for full reference.`
- New: `See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.`

**Step 2: Migrate gates in 1-execute.md**

2 gates + 1 nested gate:

Line 62 — `#### 1.4.1 Gate: implement.architectural-deviation`:
```markdown
#### 1.4.1 [GATE|implement.architectural-deviation]

Read `.beastmode/config.yaml` → resolve mode for `implement.architectural-deviation`.
Default: `human`.

##### [GATE-OPTION|human] Ask User
...
##### [GATE-OPTION|auto] Claude Decides
...
```

Note: Nested gates keep their heading depth (####/##### instead of ##/###). Task runner detects `[GATE|` regardless of heading level.

Line 99 — `## 2. Gate: implement.blocked-task-decision`:
Standard transformation to `## 2. [GATE|implement.blocked-task-decision]`.

Fix prose @ reference at line 58:
- Old: `Process the agent's deviation report per @../references/deviation-rules.md:`
- New: `Process the agent's deviation report per [deviation-rules.md](../references/deviation-rules.md):`

Drop "Execute ONLY..." lines from both gates.

**Step 3: Migrate gate in 2-validate.md (line 55)**

`## 7. Gate: implement.validation-failure` → `## 7. [GATE|implement.validation-failure]`

**Step 4: Migrate gate in 3-checkpoint.md (line 33)**

`## 4. Gate: transitions.implement-to-validate` → `## 4. [GATE|transitions.implement-to-validate]`

**Step 5: Verify**

```bash
grep "\[GATE|" skills/implement/phases/*.md           # Should find 4 gates
grep "\[GATE-OPTION|" skills/implement/phases/*.md    # Should find 8 options
grep "Gate:" skills/implement/phases/*.md             # Should return 0
grep "See @\|per @" skills/implement/phases/*.md      # Should return 0
grep "Execute ONLY" skills/implement/phases/*.md      # Should return 0
```

---

### Task 6: Validate Skill Phase Files

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/validate/phases/0-prime.md`
- Modify: `skills/validate/phases/1-execute.md`
- Modify: `skills/validate/phases/3-checkpoint.md`

**Step 1: Overhaul 0-prime.md**

Update step 1 (announce) to standardized text. Update step 2 (context) — currently "Load Context" with only 2 files, missing PRODUCT.md:

```markdown
## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/VALIDATE.md`
- `.beastmode/meta/VALIDATE.md`

Follow links in these L1 files to L2 details when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.
```

Fix prose @ reference at line 38:
- Old: `See @../_shared/worktree-manager.md for full reference.`
- New: `See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.`

**Step 2: Fix prose @ reference in 1-execute.md (line 19)**

- Old: `See @../_shared/worktree-manager.md for full reference.`
- New: `See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.`

**Step 3: Migrate gate in 3-checkpoint.md (line 15)**

`## 4. Gate: transitions.validate-to-release` → `## 4. [GATE|transitions.validate-to-release]`

**Step 4: Verify**

```bash
grep "\[GATE|" skills/validate/phases/*.md           # Should find 1 gate
grep "\[GATE-OPTION|" skills/validate/phases/*.md    # Should find 2 options
grep "Gate:" skills/validate/phases/*.md             # Should return 0
grep "See @" skills/validate/phases/*.md             # Should return 0
```

---

### Task 7: Release Skill Phase Files

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/release/phases/0-prime.md`
- Modify: `skills/release/phases/1-execute.md`
- Modify: `skills/release/phases/3-checkpoint.md`

**Step 1: Overhaul 0-prime.md**

Update step 1 (announce) to standardized text. Update step 2 (context) — currently "Load Context" with only 2 files, missing PRODUCT.md:

```markdown
## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/RELEASE.md`
- `.beastmode/meta/RELEASE.md`

Follow links in these L1 files to L2 details when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.
```

**Step 2: Migrate nested gates in 1-execute.md**

2 nested gates:

Line 38 — `### 3.1 Gate: release.version-confirmation`:
```markdown
### 3.1 [GATE|release.version-confirmation]

Read `.beastmode/config.yaml` → resolve mode for `release.version-confirmation`.
Default: `human`.

#### [GATE-OPTION|human] Ask User
...
#### [GATE-OPTION|auto] Auto-Confirm
...
```

Line 127 — `### 8.6 Gate: release.product-md-approval`:
Same pattern at ### level with #### gate options.

Drop "Execute ONLY..." lines from both.

**Step 3: Check 3-checkpoint.md for gate**

Current 3-checkpoint.md may have a transition suggestion but no formal `Gate:` heading. If it exists, migrate. If it's just prose suggesting `/release`, leave it.

**Step 4: Verify**

```bash
grep "\[GATE|" skills/release/phases/*.md           # Should find 2 gates
grep "\[GATE-OPTION|" skills/release/phases/*.md    # Should find 4 options
grep "Gate:" skills/release/phases/*.md             # Should return 0
grep "See @" skills/release/phases/*.md             # Should return 0
```

---

### Task 8: Conventions Documentation Update

**Wave:** 3
**Depends on:** Task 0, Task 2

**Files:**
- Modify: `.beastmode/context/plan/conventions.md`

**Step 1: Update Code Style > Imports section**

Add after existing import rules:

```markdown
**@ Import Semantics:**
- `@file` standalone on its own line = mandatory import (read this file now)
- `[name](path)` in prose = reference link (consult if useful)
- NEVER use `@` in flowing prose text — use markdown links instead
```

**Step 2: Update Patterns > Skill Manifest Pattern**

Replace the existing SKILL.md template with the new one showing task-runner in HARD-GATE:

```markdown
**Skill Manifest Pattern:**
Skills follow a standard YAML frontmatter + markdown structure:
\`\`\`yaml
---
name: skill-name
description: <Action words> — <keywords>. Use when <trigger>. <What it does>.
---

# /skill-name

<One sentence overview.>

<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.

<Skill-specific constraints.> [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load context, research if needed
1. [Execute](phases/1-execute.md) — Do the actual work
2. [Validate](phases/2-validate.md) — Check work, approval gates
3. [Checkpoint](phases/3-checkpoint.md) — Save artifacts, capture learnings
\`\`\`
```

**Step 3: Add gate syntax pattern**

Add a new pattern entry after "Skill Manifest Pattern":

```markdown
**Gate Syntax:**
- Gate headings: `## N. [GATE|<namespace>.<gate-id>]`
- Gate options: `### [GATE-OPTION|mode] Label`
- Preamble: 2 lines — config lookup instruction + default mode
- Nested gates use heading depth matching their context (####, #####) — task runner detects `[GATE|` regardless of heading level
- Config lookup: `gates.{id}` for approval gates, `transitions.{id}` for phase transition gates
```

**Step 4: Update Skill Authoring Rules**

Add to existing rules:
- `Task runner referenced as first line in HARD-GATE block (not trailing @import)`
- `No trailing @_shared/task-runner.md at bottom of SKILL.md`

**Step 5: Verify**

```bash
grep "GATE" .beastmode/context/plan/conventions.md         # Gate syntax documented
grep "@file" .beastmode/context/plan/conventions.md        # Import semantics documented
grep "task-runner" .beastmode/context/plan/conventions.md  # Template updated
```
