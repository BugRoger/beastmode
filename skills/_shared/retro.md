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

```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **Artifact**: {path to new state artifact}
- **L1 context path**: `.beastmode/context/{PHASE}.md`
- **Working directory**: {current working directory}
```

**Meta Walker** — read prompt from `agents/retro-meta.md`

Include in agent prompt:

```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **L1 meta path**: `.beastmode/meta/{PHASE}.md`
- **Artifacts**: {list of state artifact paths}
- **Working directory**: {current working directory}
```

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

```
#### Records ({N} proposed)

>> {existing file} — Observation {N} [{domain}] [{confidence}]
   {one-sentence summary}

+ {new file} [{domain}] [{confidence}]
   {one-sentence summary}

Apply records? [Y/n]
```

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

```
#### Context/Meta Changes ({N} edits, {N} new)

~ {target file}
  - "{old text}" → "{new text}"
  + Section: "{new section title}"
  + "{new content being added}"

+ {target file} — new file
  + Section: "{section title}"

Apply context changes? [Y/n]
```

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

```
#### Phase Updates ({N} rewrites, {N} promotions)

~ {L1 file}
  Sections rewritten: {list of section names}

^ {entry title} — L3 → L1
  + Procedure: "{ALWAYS/NEVER rule text}"
  ({basis})

Apply phase updates? [Y/n]
```

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

```
#### BEASTMODE.md Updates

~ .beastmode/BEASTMODE.md
  Section: {section name}
  - "{old text}"
  + "{new text}"

Apply BEASTMODE.md updates? [Y/n]
```

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
