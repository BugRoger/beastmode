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

**New records**: {N} ({insights count} insights, {upstream count} upstream)
**L2 edits**: {N} proposed
**Promotions**: {N} candidates ({HIGH count} immediate, {MED count} frequency-based)
```

If no findings: "Meta review: no changes needed." and skip gates 8-9.

### 8. [GATE|retro.records]

Read `.beastmode/config.yaml` → resolve mode for `retro.records`.
Default: `human`.

#### [GATE-OPTION|human] Review Records

Present all proposed L3 records (new files and appends):

```
### Meta Records

**Proposed records** ({N} total):
- {record title} — {action: create/append} {target file} [{domain}] [{confidence}]

Apply these records? [Y/n]
```

#### [GATE-OPTION|auto] Auto-Apply Records

Apply all proposed L3 records silently.
Log: "Gate `retro.records` → auto: applied {N} meta records"

### 9. [GATE|retro.promotions]

Read `.beastmode/config.yaml` → resolve mode for `retro.promotions`.
Default: `human`.

If no promotion candidates, skip this gate.

#### [GATE-OPTION|human] Review Promotions

Present each proposed promotion:

```
### Meta Promotions

**Proposed promotions** ({N} total):
- {entry title} — {current level} → {target level} ({basis})

Apply these promotions? [Y/n]
```

#### [GATE-OPTION|auto] Auto-Apply Promotions

Apply all proposed promotions silently.
Log: "Gate `retro.promotions` → auto: applied {N} promotions"

### 10. Apply Changes and Recompute L1

After gate approvals:

1. **Write approved L3 records** — Create new files or append observation sections to existing records
2. **Apply approved L2 edits** — Update `insights.md` and `upstream.md` summaries
3. **Apply approved promotions** — Add entries to L1 Procedures section, update L3 confidence tags
4. **Recompute L1 summaries** — For `meta/{PHASE}.md`:
   - Read all L2 files in `meta/{phase}/`
   - Rewrite Procedures section from promoted entries
   - Rewrite Domains summary from L2 content
   - Rewrite top-level summary paragraph

---

## L0 Promotion (Release Phase Only)

### 11. Check L0 Update Proposal

If running in the release phase, check for an L0 update proposal:

1. Look for `.beastmode/state/release/YYYY-MM-DD-<feature>-l0-proposal.md`
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
