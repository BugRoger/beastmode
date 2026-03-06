# L2 Domain Expansion Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Enable the retro system to detect missing L2 context domains and scaffold new L2 files seeded from session evidence.

**Architecture:** Extend retro-context walker with structured `context_gap` output type. Add gap processing logic to `retro.md` with confidence-scored promotion thresholds and a new HITL gate (`retro.l2-write`). Add the gate to `config.yaml`.

**Tech Stack:** Markdown agent prompts, YAML configuration

**Design Doc:** `.beastmode/state/design/2026-03-06-l2-domain-expansion.md`

---

### Task 0: Add `retro.l2-write` gate to config.yaml

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `.beastmode/config.yaml:4-21`

**Step 1: Add the new gate under the `retro` namespace**

Add `l2-write` gate to config.yaml. Insert a new `retro:` section under `gates:`:

```yaml
gates:
  design:
    existing-design-choice: human    # INTERACTIVE — prior design found, ask what to do
    gray-area-selection: human       # INTERACTIVE — which areas to discuss
    gray-area-discussion: human      # INTERACTIVE — question loop per area
    section-review: human            # INTERACTIVE — section-by-section review
    design-approval: human           # APPROVAL — approve before documenting

  plan:
    plan-approval: auto              # APPROVAL — approve before saving

  implement:
    architectural-deviation: auto    # CONDITIONAL — tier 3 deviation decision
    blocked-task-decision: auto      # CONDITIONAL — blocked task with dependents
    validation-failure: auto         # CONDITIONAL — fix loop exhausted

  retro:
    l2-write: human                  # APPROVAL — new L2 context file creation

  release:
    version-confirmation: human      # APPROVAL — version bump override
```

**Step 2: Verify YAML validity**

Run: `python3 -c "import yaml; yaml.safe_load(open('.beastmode/config.yaml')); print('valid')"`
Expected: `valid`

---

### Task 1: Extend retro-context walker with `context_gap` output type

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `agents/retro-context.md:16-31`
- Modify: `agents/retro-context.md:46-68`

**Step 1: Add Gap Detection Protocol section after "Review Focus"**

Insert a new section after `## Review Focus` (after line 31). This section teaches the context walker how to detect missing L2 domains and emit structured gap proposals:

```markdown
## Gap Detection Protocol

When reviewing L1 files for missing sections (step 2 above), apply structured gap detection:

### 1. Identify Gap Signals

Scan session artifacts and codebase for evidence of undocumented knowledge domains:

- **Codebase signals**: Patterns appearing in 3+ source files with no corresponding L2 context doc (e.g., ad-hoc error handling patterns, scattered API client code, inconsistent state management)
- **Session friction signals**: The session explicitly discussed, designed, or implemented something in a domain not covered by existing L2 files
- **Prior learning signals**: Existing entries in `meta/{phase}/learnings.md` reference the same domain concept

### 2. Score Confidence

For each detected gap, assign a confidence level:

- **HIGH**: 3+ source files with the pattern AND no existing L2 file AND session explicitly dealt with this domain
- **MEDIUM**: Pattern detected in code OR session friction, but not both
- **LOW**: Weak signal — one mention, tangential evidence, or uncertain domain boundary

### 3. Check Accumulation

Read `meta/{phase}/learnings.md` and look for a `## Context Gaps` section. Count prior entries matching the same domain + phase combination:

- HIGH confidence: promote at 1st occurrence (immediate)
- MEDIUM confidence: promote at 2nd occurrence
- LOW confidence: promote at 3rd occurrence

If below threshold, the gap is logged but not proposed for creation.

### 4. Emit Gap Proposals

For gaps that meet their promotion threshold, emit a `context_gap` finding:

```
### Finding N: Context gap — [domain name]
- **Target**: `context/{phase}/{domain}.md` (new file)
- **Type**: context_gap
- **Domain**: [kebab-case domain name]
- **Phase**: [phase where this context belongs]
- **Confidence**: HIGH | MEDIUM | LOW
- **Evidence**:
  - [specific evidence item 1]
  - [specific evidence item 2]
  - [specific evidence item 3]
- **Suggested sections**:
  - [section heading 1]
  - [section heading 2]
- **Proposed content**: [2-5 sentences of seed content extracted from session evidence]
- **Accumulation**: [Nth occurrence / threshold] (e.g., "1/1 for HIGH" or "2/2 for MEDIUM")
```

For gaps below threshold, emit as a standard finding with type `context_gap_logged`:

```
### Finding N: Context gap logged — [domain name]
- **Target**: `meta/{phase}/learnings.md` (append to Context Gaps section)
- **Type**: context_gap_logged
- **Domain**: [domain name]
- **Phase**: [phase]
- **Confidence**: [level]
- **Evidence**: [brief evidence summary]
- **Accumulation**: [Nth occurrence / threshold needed]
```
```

**Step 2: Update the Output Format section to include `context_gap` type**

In the existing `## Output Format` section (around line 46), update the `**Type**` line to include the new types:

Change:
```
- **Type**: accuracy | extension | gap | orphan | staleness
```

To:
```
- **Type**: accuracy | extension | gap | orphan | staleness | context_gap | context_gap_logged
```

**Step 3: Update Review Rules to include gap detection guidance**

In the `## Review Rules` section (around line 80), change the last rule:

From:
```
- **Flag gaps, don't fill them** — suggest new L2 files but don't write their content
```

To:
```
- **Detect and score gaps** — use the Gap Detection Protocol to emit structured `context_gap` or `context_gap_logged` findings with confidence scores and seed content
```

**Step 4: Verify the file reads cleanly**

Read the modified file end-to-end and verify:
- Gap Detection Protocol section is between "Review Focus" and "Hierarchy Awareness"
- Output Format includes new types
- Review Rules updated
- No markdown formatting errors

---

### Task 2: Add gap proposal processing to retro.md

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `skills/_shared/retro.md:108-141`

**Step 1: Insert new gap processing step after the context-changes gate**

Insert a new section `## 9. [GATE|retro.l2-write]` between the current step 8 (`[GATE|retro.context-changes]`) and step 9 (`Bottom-Up Summary Bubble`). Renumber the existing step 9 to step 10.

Insert after line 123 (after "If no findings from either agent, report..."):

```markdown
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
```

**Step 2: Renumber the existing step 9 to step 10**

Change:
```
## 9. Bottom-Up Summary Bubble
```

To:
```
## 10. Bottom-Up Summary Bubble
```

**Step 3: Verify the retro flow reads correctly**

Read the modified file and verify:
- Steps are numbered 1-10 (was 1-9)
- Gap processing (step 9) comes after context-changes gate (step 8)
- Bottom-up bubble (step 10) comes after gap processing (step 9) — so newly created L2 files get their L1 summaries bubbled up
- Gate syntax follows the `[GATE|namespace.id]` / `[GATE-OPTION|mode]` pattern

---
