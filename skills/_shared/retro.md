# Phase Retro

Review this phase's work for context doc accuracy and meta learnings.

## 1. Gather Phase Context

Determine current phase and feature:

1. Identify current phase from the skill being executed (design/plan/implement/validate/release)
2. Read phase artifacts (design doc, plan doc) from `.beastmode/state/`
3. Read the phase's context docs from `.beastmode/context/{phase}/`
4. Read the phase's meta L2 files from `.beastmode/meta/{phase}/` (sops.md, overrides.md, learnings.md)

## 2. Quick-Exit Check

Skip agent review if session was trivial:
- Phase had fewer than ~5 substantive tool calls
- No new patterns, decisions, or discrepancies observed
- Phase was a routine re-run

If skipping, add a one-liner to learnings.md if anything minor was noted, then proceed to next checkpoint step.

## 3. Spawn Review Agents

Launch 2 parallel agents:

1. **Context Walker** — read prompt from `agents/retro-context.md`
   - Agent discovers its own review targets from the L1 hierarchy
   - Reviews `.beastmode/context/{phase}/` docs for accuracy, extensions, and gaps

2. **Meta Walker** — read prompt from `agents/retro-meta.md`
   - Agent discovers its own review targets from the L1 hierarchy
   - Captures learnings, flags stale entries, detects promotion candidates

Include in both agent prompts:

```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **L1 context path**: `.beastmode/context/{PHASE}.md`
- **L1 meta path**: `.beastmode/meta/{PHASE}.md`
- **Artifacts**: {list of design/plan doc paths}
- **Worktree root**: {current working directory}
```

## 4. Present Findings

Show user a summary:

```
### Phase Retro Results

**Context changes** ({N} findings):
- {finding summary} — confidence: {level}

**Meta findings** ({N} items):
- SOPs: {count} proposed
- Overrides: {count} proposed
- Learnings: {count} new
- Auto-promotions: {count} detected
```

## 5. [GATE|retro.learnings]

Read `.beastmode/config.yaml` → resolve mode for `retro.learnings`.
Default: `human`.

### [GATE-OPTION|human] Review Learnings

Show learnings to user, then auto-append to `.beastmode/meta/{phase}/learnings.md` under the appropriate date-headed section.

### [GATE-OPTION|auto] Auto-Append Learnings

Auto-append learnings silently.
Log: "Gate `retro.learnings` → auto: appended {N} learnings"

## 6. [GATE|retro.sops]

Read `.beastmode/config.yaml` → resolve mode for `retro.sops`.
Default: `human`.

### [GATE-OPTION|human] Review SOPs

Present each proposed SOP (including auto-promoted ones) and ask for approval before writing to `.beastmode/meta/{phase}/sops.md`.
On approval of auto-promoted SOPs: annotate source learning entries in `learnings.md` with `→ promoted to SOP`.

### [GATE-OPTION|auto] Auto-Write SOPs

Auto-write all proposed SOPs.
On auto-promoted SOPs: annotate source learning entries in `learnings.md` with `→ promoted to SOP`.
Log: "Gate `retro.sops` → auto: wrote {N} SOPs"

## 7. [GATE|retro.overrides]

Read `.beastmode/config.yaml` → resolve mode for `retro.overrides`.
Default: `human`.

### [GATE-OPTION|human] Review Overrides

Present each proposed override and ask for approval before writing to `.beastmode/meta/{phase}/overrides.md`.

### [GATE-OPTION|auto] Auto-Write Overrides

Auto-write all proposed overrides.
Log: "Gate `retro.overrides` → auto: wrote {N} overrides"

## 8. [GATE|retro.context-changes]

Read `.beastmode/config.yaml` → resolve mode for `retro.context-changes`.
Default: `human`.

### [GATE-OPTION|human] Review Context Changes

Present each proposed edit with confidence annotations.
Ask per-category: "Apply these context changes? [Y/n]"

### [GATE-OPTION|auto] Auto-Apply Context Changes

Apply all context changes silently.
Log: "Gate `retro.context-changes` → auto: applied {N} context changes"

If no findings from either agent, report: "Phase retro: no changes needed." and skip gates 5-8.

## 9. Process Context Gap Proposals

If the context walker returned any `context_gap` findings (type = `context_gap`):

### 9.1 Log ALL gaps to learnings

For each `context_gap` or `context_gap_logged` finding, append to `meta/{phase}/learnings.md` under a `## Context Gaps` section (create if missing):

```markdown
### {YYYY-MM-DD}
- **{domain}** ({phase}) — {confidence} confidence
  Evidence: {evidence summary, one line}
  Status: {Proposed for creation | Logged, {N}/{threshold} occurrences}
```

### 9.2 [GATE|retro.l2-write]

Read `.beastmode/config.yaml` → resolve mode for `retro.l2-write`.
Default: `human`.

Only enter this gate if there are `context_gap` findings that met their promotion threshold.

#### [GATE-OPTION|human] Review L2 File Proposals

For each promoted `context_gap` finding, present to user:

```
Proposing new L2 file: context/{phase}/{domain}.md
Confidence: {level}
Evidence:
  - {evidence items}
Seed content preview:
  {proposed content from the finding}

Create this file? [Create / Defer / Dismiss]
```

- **Create**: Proceed to file creation (step 9.3)
- **Defer**: Log to learnings only, do not create file
- **Dismiss**: Remove from learnings, do not create file

#### [GATE-OPTION|auto] Auto-Create L2 Files

Create all promoted gap files without asking.
Log: "Gate `retro.l2-write` → auto: created {N} L2 files"

### 9.3 Create Approved L2 Files

For each approved gap:

1. **Create L2 file** at `context/{phase}/{domain}.md`:
   - Title: `# {Domain Title}` (Title Case of domain name)
   - Seed with content from the gap proposal's evidence and suggested sections
   - Include a `## Related Decisions` section (empty or populated from session artifacts)
   - Follow the project's writing guidelines (bullets over paragraphs, be concrete)

2. **Update parent L1 file** (`context/{PHASE}.md`):
   - Add a new `## {Domain Title}` section with a 1-2 sentence summary
   - Add `@{phase}/{domain}.md` import on the line after the summary

3. **Mark gap entry** in `meta/{phase}/learnings.md`:
   - Update the Status line to: `Status: Created → context/{phase}/{domain}.md`

## 10. Bottom-Up Summary Bubble

After applying L2 changes, propagate summaries upward:

1. **Update L1 summaries** — For each L1 file in the current domain (`context/{PHASE}.md`, `meta/{PHASE}.md`):
   - List all L2 files in the corresponding directory (`context/{phase}/`, `meta/{phase}/`)
   - Rewrite the section summary (2-3 sentences) to reflect current L2 content
   - Rewrite the top-level summary paragraph to reflect all sections
   - Ensure each L2 file is referenced as a plain text path (not @import)

2. **Prune stale entries** — In L2 "Related Decisions" sections:
   - Verify each linked state file still exists
   - Remove entries where the link target is missing
   - Flag entries where the one-liner no longer matches the linked file's goal

## 10. L0 Promotion (Release Phase Only)

If running in the release phase, check for an L0 update proposal:

1. Look for `.beastmode/state/release/YYYY-MM-DD-vX.Y.Z-l0-proposal.md`
2. If no proposal file exists → skip (no L0 changes needed)
3. If proposal exists → apply the proposed sections to `.beastmode/BEASTMODE.md`:
   - Replace **Capabilities** section with proposed version
   - Replace **How It Works** section with proposed version (if present in proposal)

### 10.1 [GATE|release.beastmode-md-approval]

Read `.beastmode/config.yaml` → resolve mode for `release.beastmode-md-approval`.
Default: `auto`.

#### [GATE-OPTION|human] Ask User

**Significance check:**
- If Capabilities or How It Works changed → present the before/after diff for user approval
- If neither changed → auto-apply silently

#### [GATE-OPTION|auto] Auto-Apply

Auto-apply all changes.
Log: "Gate `release.beastmode-md-approval` → auto: updated BEASTMODE.md with N new capabilities"
