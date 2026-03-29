# Retro Gate Hierarchy Alignment — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Reorganize retro gates to align with the knowledge hierarchy (L0-L3) using human-readable names, bottom-up approval ordering, and merged walker outputs.

**Architecture:** Both walkers (context + meta) spawn in parallel and return structured change proposals. A new "merge" step groups all proposed changes by hierarchy level (L3/L2/L1/L0). Four gates fire bottom-up: records → context → phase → beastmode. Each gate approves/rejects its level's changes, then a single apply step writes everything.

**Tech Stack:** Markdown skill files, YAML config, no code dependencies.

**Design Doc:** .beastmode/state/design/2026-03-08-retro-gate-hierarchy.md

---

### Task 0: Update config.yaml gate names

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `.beastmode/config.yaml:20-27`

**Step 1: Replace retro gates section**

Replace the existing `retro:` block and remove `release.beastmode-md-approval`:

```yaml
  retro:
    records: human                   # APPROVAL — L3 observation creation/appends
    context: human                   # APPROVAL — L2 context/meta doc edits + new docs
    phase: human                     # APPROVAL — L1 phase summary rewrites + promotions
    beastmode: auto                  # APPROVAL — L0 BEASTMODE.md updates
```

Remove from the `release:` block:
```yaml
    beastmode-md-approval: auto      # APPROVAL — L0 update proposal application
```

So the final `release:` block is:
```yaml
  release:
    version-confirmation: auto       # APPROVAL — version bump override
```

**Step 2: Verify**

Read `.beastmode/config.yaml` and confirm:
- `retro:` has exactly 4 keys: `records`, `context`, `phase`, `beastmode`
- `release:` has exactly 1 key: `version-confirmation`
- No reference to `context-write`, `promotions`, or `beastmode-md-approval`

---

### Task 1: Restructure retro.md — walker spawning and merge step

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/_shared/retro.md:1-247`

**Step 1: Write the new retro.md**

Replace the entire file. The new structure:

```markdown
# Phase Retro

> **NEVER** print next-step commands, transition guidance, or session-restart instructions. The transition gate in the checkpoint phase handles this exclusively.

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

## Spawn Walkers

### 3. Spawn Both Walkers in Parallel

Launch 2 agents simultaneously:

**Context Walker** — read prompt from `agents/retro-context.md`

Include in agent prompt:

` ` `
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **Artifact**: {path to new state artifact}
- **L1 context path**: `.beastmode/context/{PHASE}.md`
- **Worktree root**: {current working directory}
` ` `

**Meta Walker** — read prompt from `agents/retro-meta.md`

Include in agent prompt:

` ` `
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **L1 meta path**: `.beastmode/meta/{PHASE}.md`
- **Artifacts**: {list of state artifact paths}
- **Worktree root**: {current working directory}
` ` `

Wait for both to return before proceeding.

### 4. Merge Walker Outputs by Hierarchy Level

Collect all proposed changes from both walkers. Classify each change by hierarchy level:

- **L3 — Records**: New L3 record files, observation appends to existing records (from meta walker)
- **L2 — Context/Meta docs**: L2 file edits, new L2 file creation (from both walkers)
- **L1 — Phase summaries**: L1 summary recomputation, L3→L1 promotions (from both walkers)
- **L0 — BEASTMODE.md**: Updates to `.beastmode/BEASTMODE.md` capabilities or workflow sections

If both walkers returned "No changes needed", print "Retro: no changes needed." and skip all gates.

---

## Gate Sequence (Bottom-Up)

### 5. [GATE|retro.records]

Read `.beastmode/config.yaml` → resolve mode for `retro.records`.
Default: `human`.

If no L3 changes proposed, skip this gate.

#### [GATE-OPTION|human] Review Records

Present all proposed L3 records with one-sentence summaries:

` ` `
#### Records ({N} proposed)

>> {existing file} — Observation {N} [{domain}] [{confidence}]
   {one-sentence summary}

+ {new file} [{domain}] [{confidence}]
   {one-sentence summary}

Apply records? [Y/n]
` ` `

**Prefix key:**
- `>>` = append observation to existing record
- `+` = create new record file
- Indented line = one-sentence summary of the observation
- `[domain]` = process | workarounds
- `[confidence]` = LOW | MEDIUM | HIGH

#### [GATE-OPTION|auto] Auto-Apply Records

Apply all proposed L3 records silently.
Log: "Gate `retro.records` → auto: applied {N} records"

### 6. [GATE|retro.context]

Read `.beastmode/config.yaml` → resolve mode for `retro.context`.
Default: `human`.

If no L2 changes proposed, skip this gate.

#### [GATE-OPTION|human] Review Context and Meta Changes

Present all proposed L2 changes from both walkers with actual content:

` ` `
#### Context/Meta Changes ({N} edits, {N} new)

~ {target file}
  - "{old text}" → "{new text}"
  + Section: "{new section title}"
  + "{new content being added}"

+ {target file} — new file
  + Section: "{section title}"

Apply context changes? [Y/n]
` ` `

**Prefix key:**
- `~` = edit existing file
- `+` = create new file / add content
- `-` with `→` = content being replaced
- Indented lines = actual content being written

#### [GATE-OPTION|auto] Auto-Apply

Apply all proposed L2 changes silently.
Log: "Gate `retro.context` → auto: applied {N} context changes"

### 7. [GATE|retro.phase]

Read `.beastmode/config.yaml` → resolve mode for `retro.phase`.
Default: `human`.

If no L1 changes proposed, skip this gate.

#### [GATE-OPTION|human] Review Phase Summary Updates

Present L1 summary rewrites and any L3→L1 promotions:

` ` `
#### Phase Updates ({N} rewrites, {N} promotions)

~ {L1 file}
  Sections rewritten: {list of section names}

^ {entry title} — L3 → L1
  + Procedure: "{ALWAYS/NEVER rule text}"
  ({basis})

Apply phase updates? [Y/n]
` ` `

**Prefix key:**
- `~` = L1 file rewrite
- `^` = promote up hierarchy
- `+` = the rule being added to L1
- Indented `({basis})` = why this qualifies for promotion

#### [GATE-OPTION|auto] Auto-Apply

Apply all proposed L1 changes silently.
Log: "Gate `retro.phase` → auto: applied {N} phase updates"

### 8. [GATE|retro.beastmode]

Read `.beastmode/config.yaml` → resolve mode for `retro.beastmode`.
Default: `auto`.

If no L0 changes proposed, skip this gate.

L0 changes are proposed when:
- The meta walker detects capabilities or workflow changes significant enough to update BEASTMODE.md
- A release-phase retro has an L0 update proposal at `.beastmode/state/release/YYYY-MM-DD-<feature>-l0-proposal.md`

#### [GATE-OPTION|human] Review BEASTMODE.md Updates

Present the before/after diff for each changed section:

` ` `
#### BEASTMODE.md Updates

~ .beastmode/BEASTMODE.md
  Section: {section name}
  - "{old text}"
  + "{new text}"

Apply BEASTMODE.md updates? [Y/n]
` ` `

#### [GATE-OPTION|auto] Auto-Apply

Apply all proposed L0 changes silently.
Log: "Gate `retro.beastmode` → auto: updated BEASTMODE.md"

---

## Apply All Approved Changes

### 9. Apply Changes and Recompute Summaries

After all gates complete, apply approved changes in hierarchy order (bottom-up):

1. **L3 — Write approved records** — Create new files or append observation sections to existing records
2. **L2 — Apply approved context/meta edits** — Write changes to L2 files, create new L2 files
   - For new L2 files: add section to parent L1 with summary + plain text path reference
3. **L1 — Apply approved phase updates** — Recompute L1 summaries for affected phase files:
   - For `context/{PHASE}.md`: list L2 files, rewrite section summaries, rewrite top-level paragraph, ensure L2 paths referenced as plain text
   - For `meta/{PHASE}.md`: rewrite Procedures section from promoted entries, rewrite Domains summary, rewrite top-level paragraph
   - Apply approved promotions: add entries to L1 Procedures section, update L3 confidence tags
4. **L0 — Apply approved BEASTMODE.md updates** — Replace sections with proposed versions
5. **Prune stale links** — In L2 "Related Decisions" sections, verify linked state files exist, remove missing entries
```

**Step 2: Fix code fence escaping**

The above content uses `` ` ` ` `` as placeholder for triple backticks. When writing the actual file, use proper triple backticks (` ``` `).

**Step 3: Verify**

Read the new `retro.md` and confirm:
- Steps 1-2 unchanged (gather context, quick-exit)
- Step 3 spawns both walkers in parallel
- Step 4 merges outputs by hierarchy level
- Gates fire in order: 5 (records/L3), 6 (context/L2), 7 (phase/L1), 8 (beastmode/L0)
- Step 9 applies all changes bottom-up
- No reference to `context-write`, `promotions`, or `release.beastmode-md-approval`
- Gate IDs match config.yaml: `retro.records`, `retro.context`, `retro.phase`, `retro.beastmode`

---

### Task 2: Remove L0 proposal from release execute phase

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/1-execute.md:110-139`

**Step 1: Remove step 8 entirely**

Delete the entire "## 8. Prepare L0 Update Proposal" section (lines 110-139). The L0 proposal logic now lives in `retro.md` step 8 (`retro.beastmode` gate), available to any phase.

**Step 2: Update step 0 reference**

Change line 5 from:
```
All steps from here through step 8 (L0 Update Proposal) MUST execute inside the worktree.
```
to:
```
All steps from here through step 7 (Bump Version Files) MUST execute inside the worktree.
```

**Step 3: Verify**

Read `skills/release/phases/1-execute.md` and confirm:
- No "L0 Update Proposal" section
- Step numbering ends at 7 (Bump Version Files)
- No reference to `beastmode-md-approval` or `l0-proposal`

---

### Task 3: Update configurable-gates.md

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `docs/configurable-gates.md:38-85`

**Step 1: Update the gate diagram**

Replace the ASCII diagram (lines 38-56) with:

```
 DESIGN        PLAN         IMPLEMENT      VALIDATE      RELEASE
 ──────        ────         ─────────      ────────      ───────
 |             |            |              |             |
 * intent      * plan       * deviation    |             * version
   discussion    approval     handling     |               confirm
 |             |            |              |             |
 * approach                 * blocked      |
   selection                  task         |
 |                          |              |
 * section                  * validation   |
   review                     failure      |
 |                                         |
 * design                                  |
   approval                                |
 |             |            |              |             |
 └─── auto ────┘─── auto ──┘──── auto ────┘──── auto ──┘
      transition   transition    transition    transition

 RETRO (runs at end of every phase)
 ─────
 * records       — L3 observation writes
 * context       — L2 doc edits
 * phase         — L1 summary rewrites + promotions
 * beastmode     — L0 BEASTMODE.md updates
```

**Step 2: Update the descriptive paragraph**

Replace lines 82-85:
```
The diagram above shows phase gates. The retro sub-phase and release phase have
additional gates: `retro.context-write`, `retro.records`, `retro.promotions`,
`release.version-confirmation`, and `release.beastmode-md-approval`. See
`.beastmode/config.yaml` for the full gate inventory.
```

With:
```
The diagram above shows phase gates and retro gates. Retro gates run at the end of
every phase and are ordered bottom-up through the knowledge hierarchy (L3 → L0).
The release phase has one additional gate: `release.version-confirmation`. See
`.beastmode/config.yaml` for the full gate inventory.
```

**Step 3: Update the example YAML blocks**

In the "fresh project" example (lines 91-106), add the retro gates:

```yaml
  retro:
    records: human
    context: human
    phase: human
    beastmode: human
```

In the "after a few sessions" example (lines 112-125), show evolved retro config:

```yaml
  retro:
    records: auto             # L3 observations are routine
    context: human            # still reviewing L2 doc changes
    phase: human              # still reviewing L1 summaries
    beastmode: auto           # L0 updates are rare, trust the logic
```

**Step 4: Verify**

Read `docs/configurable-gates.md` and confirm:
- No reference to `context-write`, `promotions`, or `beastmode-md-approval`
- Retro gates appear in the diagram as a separate section
- Example YAML blocks use new gate names

---

### Task 4: Update context docs referencing old gate names

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/context/design/architecture.md:55-56`
- Modify: `.beastmode/context/design/architecture/retro-reconciliation.md:7`
- Modify: `.beastmode/context/design/architecture/retro-promotion.md:7`

**Step 1: Update architecture.md lines 55-56**

Replace:
```
- Two meta retro gates: retro.records (L3 writes) and retro.promotions (L1/L2 upgrades) — granular control
- Single `retro.context-write` gate covers context doc writes — unified approval
```

With:
```
- Four retro gates aligned to hierarchy: retro.records (L3), retro.context (L2), retro.phase (L1), retro.beastmode (L0) — bottom-up approval
```

**Step 2: Update retro-reconciliation.md line 7**

Replace `Single `retro.context-write` gate replaces per-category gates.` with `Four hierarchy-aligned gates (records/context/phase/beastmode) replace the previous three-gate layout.`

**Step 3: Update retro-promotion.md line 7**

Read the file first, then replace any reference to `retro.promotions` with `retro.phase` (which now covers both promotions and L1 summary rewrites).

**Step 4: Verify**

Grep for `context-write`, `promotions` (as a gate name), and `beastmode-md-approval` across `.beastmode/context/`. Confirm zero matches.

---
