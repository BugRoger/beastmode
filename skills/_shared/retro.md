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
