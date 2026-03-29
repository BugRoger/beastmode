# Meta Retro Workers Rework Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Rebuild the meta retro walker to mirror the context walker's L1/L2/L3 hierarchy with confidence-gated promotion.

**Architecture:** Rewrite `agents/retro-meta.md` with context-walker-mirrored algorithm (L1 quick-check → L2 deep-check → L3 record management → promotion check). Update orchestrator `skills/_shared/retro.md` steps 6-10 with new gate structure (records + promotions). Migrate existing meta content from flat files to L2/L3 hierarchy.

**Tech Stack:** Markdown, YAML (config.yaml)

**Design Doc:** `.beastmode/state/design/2026-03-07-meta-retro-rework.md`

---

### Task 0: Update config.yaml gate names

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `.beastmode/config.yaml:20-24`

**Step 1: Replace old retro gate names with new ones**

Replace the retro gates section:

```yaml
  retro:
    context-write: human             # APPROVAL — all context doc writes (L2 edits + new L2 files)
    records: human                   # APPROVAL — L3 record creation and appends
    promotions: human                # APPROVAL — promotions to L1/L2
```

This removes `learnings`, `sops`, `overrides` and adds `records`, `promotions`. The `context-write` gate is unchanged.

**Step 2: Verify**

Read `.beastmode/config.yaml` and confirm only 3 retro gates exist: `context-write`, `records`, `promotions`.

---

### Task 1: Rewrite meta walker agent

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `agents/retro-meta.md`

**Step 1: Write the new meta walker agent**

Replace the entire contents of `agents/retro-meta.md` with the new algorithm that mirrors the context walker. The new agent has:

- **Role**: Walk meta L1/L2/L3 hierarchy for the current phase, propose changes based on session artifacts
- **Input**: Same Session Context block format (Phase, Feature, L1 meta path, Artifacts, Worktree root)
- **Algorithm** (6 steps):
  1. **Session Extraction** — Read session artifacts, extract process friction, decisions about how work was done, workarounds, effective patterns, beastmode-specific issues
  2. **L1 Quick-Check** — Read `meta/{PHASE}.md`. Check if Procedures section and domain summaries account for session findings. If ALL pass → report "No changes needed." and stop
  3. **L2 Deep Check** — For each flagged L2 file (`insights.md`, `upstream.md`): read, check accuracy/completeness against findings, propose edits
  4. **L3 Record Management** — For each new finding:
     - Classify: insight (process pattern) or upstream (beastmode feedback)
     - Cluster match: list existing L3 records in `meta/{phase}/insights/` and `meta/{phase}/upstream/`, check if topic matches existing record
     - If match → propose appending `## Observation N` section to existing record
     - If no match → propose new L3 record file with kebab-case name
     - Tag confidence: [HIGH] for explicit user instruction, [MEDIUM] for recurring pattern (2+ observations), [LOW] for first-time observation
  5. **Promotion Check** — Scan ALL L3 records in current phase's domains:
     - [HIGH] confidence → propose immediate L1 Procedure promotion
     - [MEDIUM] + 3 observations → propose L2 summary update + L1 promotion candidate
     - [LOW] + 3 observations → propose confidence upgrade to [MEDIUM]
     - Explicit user instruction in session → override frequency rules
  6. **Emit Changes** — Return structured list
- **Output Format**: Same structure as context walker — `## Proposed Changes` with `### Change N: [title]` entries, each having Target, Action (edit/create/append), Content
- **L3 Record Format**:
  ```markdown
  # {Title}

  ## Observation 1
  ### Context
  {When/where observed}
  ### Observation
  {What was noticed}
  ### Rationale
  {Why this matters}
  ### Source
  {state artifact path}
  ### Confidence
  [LOW|MEDIUM|HIGH] — {basis}
  ```
- **Classification Heuristics**:
  - Insight: about the project's development process, patterns, friction, effective approaches
  - Upstream: about beastmode tool behavior, limitations, bugs, workarounds
- **Rules**:
  - Artifact-scoped — only review findings relevant to this session's artifacts
  - L1 first — use L1 as fast exit before reading L2/L3
  - Be specific — include exact files and content for proposed changes
  - Classify conservatively — when ambiguous, default to insight over upstream
  - Preserve structure — propose edits within existing document structure
  - No duplicates — check existing L3 records before proposing new ones

**Step 2: Verify**

Read `agents/retro-meta.md` and confirm:
- Algorithm has 6 steps matching design (Session Extraction, L1 Quick-Check, L2 Deep Check, L3 Record Management, Promotion Check, Emit Changes)
- Output format matches context walker's proposed changes structure
- L3 record format includes Context/Observation/Rationale/Source/Confidence sections
- Promotion thresholds documented: [HIGH] immediate, [MEDIUM]+3 → L1, [LOW]+3 → [MEDIUM]

---

### Task 2: Update retro orchestrator meta section

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/retro.md:87-165`

**Step 1: Replace steps 6-10 in the Meta Review section**

Replace the entire `## Meta Review` section (from `### 6. Spawn Meta Walker` through `### 10. [GATE|retro.overrides]` and its subsections) with the new structure:

```markdown
## Meta Review

### 6. Spawn Meta Walker

Launch 1 agent:

**Meta Walker** — read prompt from `agents/retro-meta.md`

Include in agent prompt:

\```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **L1 meta path**: `.beastmode/meta/{PHASE}.md`
- **Artifacts**: {list of state artifact paths}
- **Worktree root**: {current working directory}
\```

### 7. Present Meta Findings

Show user a summary:

\```
### Meta Review Results

**New records**: {N} ({insights count} insights, {upstream count} upstream)
**L2 edits**: {N} proposed
**Promotions**: {N} candidates ({HIGH count} immediate, {MED count} frequency-based)
\```

If no findings: "Meta review: no changes needed." and skip gates 8-9.

### 8. [GATE|retro.records]

Read `.beastmode/config.yaml` → resolve mode for `retro.records`.
Default: `human`.

#### [GATE-OPTION|human] Review Records

Present all proposed L3 records (new files and appends):

\```
### Meta Records

**Proposed records** ({N} total):
- {record title} — {action: create/append} {target file} [{domain}] [{confidence}]

Apply these records? [Y/n]
\```

#### [GATE-OPTION|auto] Auto-Apply Records

Apply all proposed L3 records silently.
Log: "Gate `retro.records` → auto: applied {N} meta records"

### 9. [GATE|retro.promotions]

Read `.beastmode/config.yaml` → resolve mode for `retro.promotions`.
Default: `human`.

If no promotion candidates, skip this gate.

#### [GATE-OPTION|human] Review Promotions

Present each proposed promotion:

\```
### Meta Promotions

**Proposed promotions** ({N} total):
- {entry title} — {current level} → {target level} ({basis})

Apply these promotions? [Y/n]
\```

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
```

**Step 2: Verify**

Read `skills/_shared/retro.md` and confirm:
- Steps 6-10 use new structure
- Step 8 references `retro.records` gate (not `retro.learnings`)
- Step 9 references `retro.promotions` gate (not `retro.sops`/`retro.overrides`)
- Step 10 includes L1 recompute
- L0 Promotion section (step 11) is unchanged

---

### Task 3: Migrate design phase meta (heaviest phase)

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/meta/DESIGN.md`
- Create: `.beastmode/meta/design/insights.md`
- Create: `.beastmode/meta/design/upstream.md`
- Create: `.beastmode/meta/design/insights/` (multiple L3 record files)
- Create: `.beastmode/meta/design/upstream/` (directory, initially empty)
- Remove: `.beastmode/meta/design/sops.md`
- Remove: `.beastmode/meta/design/overrides.md`
- Remove: `.beastmode/meta/design/learnings.md`

**Step 1: Create L3 record directories**

```bash
mkdir -p .beastmode/meta/design/insights
mkdir -p .beastmode/meta/design/upstream
```

**Step 2: Migrate learnings to L3 insight records**

Read `.beastmode/meta/design/learnings.md`. For each learning or cluster of related learnings, create a topic-clustered L3 record file in `.beastmode/meta/design/insights/`.

Topic clusters to extract (based on content analysis):
- `competitive-analysis.md` — learnings about research-before-design patterns
- `fractal-consistency.md` — learnings about applying patterns uniformly (multiple promoted entries)
- `hitl-gate-design.md` — learnings about gate format, competing mechanisms, structural enforcement
- `cross-session-state.md` — learnings about session boundary state loss
- `instruction-visibility.md` — learnings about HTML comments, @imports, and critical-path instructions
- `scope-management.md` — learnings about deferred ideas, YAGNI, scope guardrails
- `l0-content-scope.md` — learnings about what belongs in L0 vs skills
- `agent-organization.md` — learnings about agent file naming, classification rules
- `retro-walker-design.md` — learnings about mirroring walkers, gate-to-decision mapping, confidence models
- `external-docs-drift.md` — learnings about README/ROADMAP/docs drift from internal knowledge
- `banner-visibility.md` — learnings about session-start banner, skill preemption, wording precision

Each L3 record file follows the structured format with Context/Observation/Rationale/Source/Confidence sections. Learnings that appear in multiple features get multiple `## Observation N` sections.

Tag confidence:
- Entries with `→ promoted to SOP` annotation → [HIGH]
- Entries appearing in 2+ features → [MEDIUM]
- Single-feature entries → [LOW]

**Step 3: Migrate SOPs to L1 Procedures**

Read `.beastmode/meta/design/sops.md`. Convert each SOP to an L1 Procedure entry:
- "Research before structural design decisions" → `1. ALWAYS produce dated research artifacts from 3+ external sources before locking structural decisions`
- "Walk every instance, don't describe the pattern" → `2. ALWAYS enumerate every instance in concrete tables for N-instance decisions`
- "Mirror existing patterns before designing from scratch" → `3. ALWAYS start from existing algorithms when building structurally analogous subsystems`

**Step 4: Migrate overrides**

Read `.beastmode/meta/design/overrides.md`. If it has content (currently "No project-specific design overrides yet"), classify each entry as insight or upstream and create the appropriate L3 record. If empty, skip.

**Step 5: Create insights.md L2 summary**

Write `.beastmode/meta/design/insights.md` as an L2 summary file. Format:

```markdown
# Design Insights

Emerging process patterns from design phases. Key themes: research-informed design decisions, fractal consistency across domains, structural enforcement of HITL gates, instruction visibility on critical paths, scope management with explicit deferral, and mirroring existing patterns for new subsystems.

Insights span competitive analysis approaches, cross-session state management, L0 content scoping, agent file organization, retro walker design patterns, external documentation drift, and banner/session-start behavior.
```

**Step 6: Create upstream.md L2 summary**

Write `.beastmode/meta/design/upstream.md`:

```markdown
# Design Upstream

Beastmode-specific feedback from design phases. No upstream entries yet — this domain captures friction, bugs, or workarounds related to the beastmode tool itself.
```

**Step 7: Rewrite DESIGN.md L1 to new format**

Rewrite `.beastmode/meta/DESIGN.md` with new structure:

```markdown
# Design Meta

{Summary paragraph reflecting all L2 content — insights themes and upstream status}

## Procedures
{3 promoted entries from SOPs, formatted as ALWAYS/NEVER rules}

1. ALWAYS produce dated research artifacts from 3+ external sources before locking structural decisions — research-informed designs outperform brainstormed ones
2. ALWAYS enumerate every instance in concrete tables for N-instance decisions — catches edge cases that pattern descriptions miss
3. ALWAYS start from existing algorithms when building structurally analogous subsystems — constrains design space and ensures consistency

## Domains
Summary of insights and upstream L2 content.
```

**Step 8: Remove old files**

```bash
rm .beastmode/meta/design/sops.md
rm .beastmode/meta/design/overrides.md
rm .beastmode/meta/design/learnings.md
```

**Step 9: Verify**

- Confirm `.beastmode/meta/design/insights/` contains topic-clustered L3 files
- Confirm `.beastmode/meta/design/upstream/` exists (empty or with records)
- Confirm `.beastmode/meta/DESIGN.md` has Procedures section with 3 entries
- Confirm old files (sops.md, overrides.md, learnings.md) are removed
- Confirm no learnings were lost — cross-reference L3 record count against source learning count

---

### Task 4: Migrate implement phase meta

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/meta/IMPLEMENT.md`
- Create: `.beastmode/meta/implement/insights.md`
- Create: `.beastmode/meta/implement/upstream.md`
- Create: `.beastmode/meta/implement/insights/` (L3 records)
- Create: `.beastmode/meta/implement/upstream/` (empty directory)
- Remove: `.beastmode/meta/implement/sops.md`
- Remove: `.beastmode/meta/implement/overrides.md`
- Remove: `.beastmode/meta/implement/learnings.md`

**Step 1: Create directories**

```bash
mkdir -p .beastmode/meta/implement/insights
mkdir -p .beastmode/meta/implement/upstream
```

**Step 2: Migrate learnings to L3 insight records**

Read `.beastmode/meta/implement/learnings.md` (3 learnings from hitl-gate-config, 3 from hitl-adherence). Topic clusters:
- `parallel-dispatch.md` — file-isolated waves, annotation tasks, uniform transformation scaling
- `structural-adaptation.md` — heading depth adaptation, demoted file retention

Tag confidence: entries appearing in 2 features → [MEDIUM], single → [LOW].

**Step 3: Create L2 summaries and rewrite L1**

Same pattern as Task 3: create `insights.md` summary, `upstream.md` (empty), rewrite `IMPLEMENT.md` with Procedures (none yet — no SOPs exist) + Domains sections.

**Step 4: Remove old files and verify**

```bash
rm .beastmode/meta/implement/sops.md
rm .beastmode/meta/implement/overrides.md
rm .beastmode/meta/implement/learnings.md
```

---

### Task 5: Migrate plan phase meta

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/meta/PLAN.md`
- Create: `.beastmode/meta/plan/insights.md`
- Create: `.beastmode/meta/plan/upstream.md`
- Create: `.beastmode/meta/plan/insights/` (L3 records)
- Create: `.beastmode/meta/plan/upstream/` (empty directory)
- Remove: `.beastmode/meta/plan/sops.md`
- Remove: `.beastmode/meta/plan/overrides.md`
- Remove: `.beastmode/meta/plan/learnings.md`

**Step 1: Create directories and migrate**

2 learnings → 1 topic cluster: `design-to-plan-mapping.md` ([LOW] confidence).

**Step 2: Create L2 summaries, rewrite L1, remove old files, verify**

Same pattern. No SOPs to migrate.

---

### Task 6: Migrate release phase meta

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/meta/RELEASE.md`
- Create: `.beastmode/meta/release/insights.md`
- Create: `.beastmode/meta/release/upstream.md`
- Create: `.beastmode/meta/release/insights/` (L3 records)
- Create: `.beastmode/meta/release/upstream/` (empty directory)
- Remove: `.beastmode/meta/release/sops.md`
- Remove: `.beastmode/meta/release/overrides.md`
- Remove: `.beastmode/meta/release/learnings.md`

**Step 1: Create directories and migrate**

Read `.beastmode/meta/release/learnings.md` (~18 lines, 2 feature sections). Topic clusters:
- `version-conflict-management.md` — structural version stale issues with worktrees ([MEDIUM], appears in 2 features)
- `squash-merge-workflow.md` — squash merge mechanics, archive tags, step ordering ([LOW])
- `retro-timing.md` — retro must run before commit, doc-only releases skip validate ([LOW])

**Step 2: Create L2 summaries, rewrite L1, remove old files, verify**

Same pattern. No SOPs to migrate.

---

### Task 7: Migrate validate phase meta

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/meta/VALIDATE.md`
- Create: `.beastmode/meta/validate/insights.md`
- Create: `.beastmode/meta/validate/upstream.md`
- Create: `.beastmode/meta/validate/insights/` (empty directory)
- Create: `.beastmode/meta/validate/upstream/` (empty directory)
- Remove: `.beastmode/meta/validate/sops.md`
- Remove: `.beastmode/meta/validate/overrides.md`
- Remove: `.beastmode/meta/validate/learnings.md`

**Step 1: Create directories, empty L2 summaries, rewrite L1, remove old files**

Validate has no learnings (just an HTML comment placeholder). Create the structure with empty L2 summaries and no L3 records.

**Step 2: Verify**

Confirm directory structure exists and old files removed.

---

### Task 8: Verify full migration integrity

**Wave:** 3
**Depends on:** Task 3, Task 4, Task 5, Task 6, Task 7

**Files:**
- Read-only: all `.beastmode/meta/` files

**Step 1: Verify directory structure**

```bash
find .beastmode/meta -type f -name "*.md" | sort
find .beastmode/meta -type d | sort
```

Expected:
- 5 L1 files: `meta/{PHASE}.md`
- 10 L2 files: `meta/{phase}/insights.md` + `meta/{phase}/upstream.md`
- L3 records in `meta/{phase}/insights/` (design has ~11, implement ~2, plan ~1, release ~3, validate 0)
- No `sops.md`, `overrides.md`, or `learnings.md` files anywhere

**Step 2: Verify no content loss**

Count total L3 records across all phases. Cross-reference against source learnings count from old files:
- Design: ~97 lines → ~11 topic-clustered L3 records
- Implement: ~12 lines → ~2 L3 records
- Plan: ~6 lines → ~1 L3 record
- Release: ~18 lines → ~3 L3 records
- Validate: 0 → 0 L3 records

**Step 3: Verify L1 format**

Read each `meta/{PHASE}.md` and confirm:
- Summary paragraph present
- Procedures section present (with entries for design, empty for others)
- Domains section present

**Step 4: Verify L3 record format**

Spot-check 2-3 L3 records and confirm they follow:
- `# {Title}` heading
- `## Observation N` sections
- Each observation has Context/Observation/Rationale/Source/Confidence subsections
- Confidence tags are [LOW], [MEDIUM], or [HIGH]
