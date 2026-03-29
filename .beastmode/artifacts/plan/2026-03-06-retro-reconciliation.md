# Retro Context Reconciliation Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Replace the exhaustive retro context walker with a focused, artifact-scoped reconciliation that only checks/fixes docs affected by the new state artifact.

**Architecture:** Top-down reconciliation — context walker takes an artifact path, does L1 quick-check for fast exit, L2 deep check only if suspicious, recognizes new areas needing L2 files, single write gate, L1 recompute after changes. Meta walker untouched.

**Tech Stack:** Markdown agent prompts, YAML config

**Design Doc:** [.beastmode/state/design/2026-03-06-retro-reconciliation.md](../../design/2026-03-06-retro-reconciliation.md)

---

### Task 0: Rewrite context walker agent

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `agents/retro-context.md:1-154`

**Step 1: Replace the entire agent prompt**

Replace the full contents of `agents/retro-context.md` with the new artifact-scoped reconciliation agent:

```markdown
# Context Reconciliation Agent

Reconcile context docs against a new state artifact.

## Role

Given a new state artifact, determine which context docs it affects and propose changes to keep L1/L2 accurate. Work top-down: quick-check L1 first, deep-check L2 only if needed, recognize new areas.

## Input

The orchestrator provides a Session Context block:

- **Phase**: current phase (design/plan/implement/validate/release)
- **Feature**: feature name
- **Artifact**: path to the new state artifact
- **L1 context path**: `.beastmode/context/{PHASE}.md`
- **Worktree root**: current working directory

## Algorithm

### 1. Scope Resolution

Read the new state artifact. Extract:
- Key concepts, decisions, and patterns introduced
- Domain areas touched (architecture, testing, conventions, etc.)

List all `.md` files in `context/{phase}/` directory. For each, determine relevance based on topic overlap with the artifact. Irrelevant files are skipped entirely.

### 2. L1 Quick-Check

Read `context/{PHASE}.md`. For each section summary:
- Does it already account for the artifact's concepts?
- Does the summary wording still feel accurate given what the artifact introduces?

If ALL sections pass → report "No changes needed." and stop.
If ANY section feels stale or incomplete → flag it for L2 deep check.

### 3. L2 Deep Check

For each L2 file flagged by the L1 quick-check:

1. Read full content
2. Compare against artifact:
   - **Accuracy** — Does content still match reality?
   - **Completeness** — Are new decisions/patterns missing?
   - **Related Decisions** — Should a new link to this artifact be added?
3. If accurate → skip
4. If stale → compute proposed edit (exact text to change)

### 4. New Area Recognition

Does the artifact introduce a concept that has no L2 home?

1. List existing L2 filenames in `context/{phase}/`
2. If the artifact's primary topic doesn't map to any existing L2 → propose new L2 file:
   - Filename: `context/{phase}/{domain}.md`
   - Seed content: extracted from the artifact's key decisions and approach
   - Parent L1 section: summary to add to `context/{PHASE}.md`

This is NOT gap detection. No confidence scoring, no accumulation thresholds. Just: "this concept has no doc home, here's a draft."

### 5. Emit Changes

Return a structured list of all proposed changes.

## Output Format

```
## Proposed Changes

### Change 1: [title]
- **Target**: [file path]
- **Action**: edit | create
- **Content**: [proposed text or diff]

### Change 2: ...
```

If nothing needs changing:

```
## Proposed Changes

No changes needed. L1 summaries already account for this artifact.
```

## Rules

- **Artifact-scoped** — only check docs relevant to the new artifact
- **L1 first** — use L1 as a fast exit before reading L2 files
- **Be specific** — include exact sections/lines to change
- **Preserve structure** — suggest edits within existing document structure
- **No gap detection** — only recognize obvious new areas, don't scan for patterns
- **No confidence scoring** — propose changes or don't; no HIGH/MEDIUM/LOW
```

**Step 2: Verify the file reads correctly**

Read `agents/retro-context.md` and confirm:
- Title is "Context Reconciliation Agent"
- Algorithm has 5 steps: Scope Resolution, L1 Quick-Check, L2 Deep Check, New Area Recognition, Emit Changes
- No references to gap detection, confidence scoring, or accumulation thresholds
- Output format uses "Proposed Changes" structure

---

### Task 1: Rewrite retro.md context section

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/_shared/retro.md:1-228`

**Step 1: Rewrite the full retro.md**

Replace the entire contents of `skills/_shared/retro.md`. The new version keeps the meta walker steps intact but replaces the context walker flow (old steps 3/4/8/9/10) with a 4-step context reconciliation, and consolidates gates.

```markdown
# Phase Retro

Review this phase's work for context doc accuracy and meta learnings.

## 1. Gather Phase Context

Determine current phase and feature:

1. Identify current phase from the skill being executed (design/plan/implement/validate/release)
2. Read phase artifacts (design doc, plan doc) from `.beastmode/state/`
3. Identify the most recent state artifact produced this phase (the reconciliation target)

## 2. Quick-Exit Check

Skip retro entirely if session was trivial:
- Phase had fewer than ~5 substantive tool calls
- No new patterns, decisions, or discrepancies observed
- Phase was a routine re-run

If skipping, proceed to next checkpoint step.

---

## Context Reconciliation

### 3. Spawn Context Walker

Launch 1 agent:

**Context Walker** — read prompt from `agents/retro-context.md`

Include in agent prompt:

```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **Artifact**: {path to new state artifact}
- **L1 context path**: `.beastmode/context/{PHASE}.md`
- **Worktree root**: {current working directory}
```

### 4. [GATE|retro.context-write]

Read `.beastmode/config.yaml` → resolve mode for `retro.context-write`.
Default: `human`.

If the context walker returned "No changes needed", skip this gate.

#### [GATE-OPTION|human] Review Context Changes

Present all proposed changes (L2 edits + new L2 files):

```
### Context Reconciliation Results

**Proposed changes** ({N} total):
- {change title} — {action: edit/create} {target file}

Apply these changes? [Y/n]
```

#### [GATE-OPTION|auto] Auto-Apply

Apply all proposed changes silently.
Log: "Gate `retro.context-write` → auto: applied {N} context changes"

### 5. Apply Changes and Recompute L1

After gate approval:

1. **Apply L2 edits** — Write proposed changes to target L2 files
2. **Create new L2 files** — For any "create" actions:
   - Write the L2 file at `context/{phase}/{domain}.md`
   - Add a section to `context/{PHASE}.md` with summary + plain text path reference
3. **Recompute L1 summaries** — For `context/{PHASE}.md`:
   - List all L2 files in `context/{phase}/`
   - Rewrite each section summary (2-3 sentences) to reflect current L2 content
   - Rewrite the top-level summary paragraph to reflect all sections
   - Ensure each L2 file is referenced as a plain text path (not @import)
4. **Prune stale links** — In L2 "Related Decisions" sections:
   - Verify each linked state file still exists
   - Remove entries where the link target is missing

---

## Meta Review

### 6. Spawn Meta Walker

Launch 1 agent:

**Meta Walker** — read prompt from `agents/retro-meta.md`

Include in agent prompt:

```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **L1 meta path**: `.beastmode/meta/{PHASE}.md`
- **Artifacts**: {list of state artifact paths}
- **Worktree root**: {current working directory}
```

### 7. Present Meta Findings

Show user a summary:

```
### Meta Review Results

**Meta findings** ({N} items):
- SOPs: {count} proposed
- Overrides: {count} proposed
- Learnings: {count} new
- Promotion candidates: {count} detected
```

If no findings: "Meta review: no changes needed." and skip gates 8-10.

### 8. [GATE|retro.learnings]

Read `.beastmode/config.yaml` → resolve mode for `retro.learnings`.
Default: `human`.

#### [GATE-OPTION|human] Review Learnings

Show learnings to user, then auto-append to `.beastmode/meta/{phase}/learnings.md` under the appropriate date-headed section.

#### [GATE-OPTION|auto] Auto-Append Learnings

Auto-append learnings silently.
Log: "Gate `retro.learnings` → auto: appended {N} learnings"

### 9. [GATE|retro.sops]

Read `.beastmode/config.yaml` → resolve mode for `retro.sops`.
Default: `human`.

#### [GATE-OPTION|human] Review SOPs

Present each proposed SOP (including auto-promoted ones) and ask for approval before writing to `.beastmode/meta/{phase}/sops.md`.
On approval of auto-promoted SOPs: annotate source learning entries in `learnings.md` with `→ promoted to SOP`.

#### [GATE-OPTION|auto] Auto-Write SOPs

Auto-write all proposed SOPs.
On auto-promoted SOPs: annotate source learning entries in `learnings.md` with `→ promoted to SOP`.
Log: "Gate `retro.sops` → auto: wrote {N} SOPs"

### 10. [GATE|retro.overrides]

Read `.beastmode/config.yaml` → resolve mode for `retro.overrides`.
Default: `human`.

#### [GATE-OPTION|human] Review Overrides

Present each proposed override and ask for approval before writing to `.beastmode/meta/{phase}/overrides.md`.

#### [GATE-OPTION|auto] Auto-Write Overrides

Auto-write all proposed overrides.
Log: "Gate `retro.overrides` → auto: wrote {N} overrides"

---

## L0 Promotion (Release Phase Only)

### 11. Check L0 Update Proposal

If running in the release phase, check for an L0 update proposal:

1. Look for `.beastmode/state/release/YYYY-MM-DD-vX.Y.Z-l0-proposal.md`
2. If no proposal file exists → skip (no L0 changes needed)
3. If proposal exists → apply the proposed sections to `.beastmode/BEASTMODE.md`:
   - Replace **Capabilities** section with proposed version
   - Replace **How It Works** section with proposed version (if present in proposal)

#### 11.1 [GATE|release.beastmode-md-approval]

Read `.beastmode/config.yaml` → resolve mode for `release.beastmode-md-approval`.
Default: `auto`.

##### [GATE-OPTION|human] Ask User

**Significance check:**
- If Capabilities or How It Works changed → present the before/after diff for user approval
- If neither changed → auto-apply silently

##### [GATE-OPTION|auto] Auto-Apply

Auto-apply all changes.
Log: "Gate `release.beastmode-md-approval` → auto: updated BEASTMODE.md with N new capabilities"
```

**Step 2: Verify the structure**

Read `skills/_shared/retro.md` and confirm:
- Steps 1-2: Gather context, quick-exit (unchanged logic)
- Steps 3-5: Context Reconciliation (spawn walker, single gate, apply + recompute)
- Steps 6-10: Meta Review (spawn walker, present, learnings/SOPs/overrides gates — unchanged)
- Step 11: L0 Promotion (release only — unchanged)
- No references to: `retro.context-changes`, `retro.l2-write`, gap detection, accumulation thresholds
- Single gate `retro.context-write` replaces old `retro.context-changes` + `retro.l2-write`

---

### Task 2: Update config.yaml gates

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `.beastmode/config.yaml:20-21`

**Step 1: Replace the retro gate configuration**

In `.beastmode/config.yaml`, replace the `retro:` section:

Old (line 20-21):
```yaml
  retro:
    l2-write: human                  # APPROVAL — new L2 context file creation
```

New:
```yaml
  retro:
    context-write: human             # APPROVAL — all context doc writes (L2 edits + new L2 files)
```

**Step 2: Verify config**

Read `.beastmode/config.yaml` and confirm:
- `retro.context-write: human` exists
- No `retro.l2-write` or `retro.context-changes` entries
- All other gates unchanged
