# Meta Hierarchy Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Restructure the meta domain to follow the same fractal L1/L2 hierarchy as context, with three L2 categories per phase (SOPs, overrides, learnings), retro classification, tiered HITL gates, and auto-promotion.

**Architecture:** Create 15 new L2 files (3 per phase × 5 phases), rewrite 5 L1 files to progressive format, update retro-meta agent with classification protocol + auto-promotion, update retro orchestrator with tiered write routing + 3 HITL gates, and update documentation (META.md, architecture.md, structure.md).

**Tech Stack:** Markdown, YAML (HITL gate annotations)

**Design Doc:** `.beastmode/state/design/2026-03-05-meta-hierarchy.md`

---

### Task 0: Create L2 Files for Design Phase (Migration)

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `.beastmode/meta/design/sops.md`
- Create: `.beastmode/meta/design/overrides.md`
- Create: `.beastmode/meta/design/learnings.md`

**Step 1: Create the design L2 directory**

```bash
mkdir -p .beastmode/meta/design
```

**Step 2: Create sops.md (empty template)**

Write to `.beastmode/meta/design/sops.md`:

```markdown
# Design SOPs

Standard operating procedures for the design phase.

## Procedures

<!-- SOPs added by retro classification or auto-promotion -->
```

**Step 3: Create overrides.md (empty template)**

Write to `.beastmode/meta/design/overrides.md`:

```markdown
# Design Overrides

Project-specific customizations for the design phase.

## Active Overrides

<!-- Overrides added by retro classification or user -->
```

**Step 4: Migrate learnings from DESIGN.md to learnings.md**

Read `.beastmode/meta/DESIGN.md`. Extract the entire `## Learnings` section (including all `### YYYY-MM-DD: feature` subsections). Write to `.beastmode/meta/design/learnings.md`:

```markdown
# Design Learnings

Friction and insights captured during design retros.

- **Parse vs Execute contradiction** (2026-03-04): When a prompt has two mechanisms that touch the same data (Step 1 parses tasks, Step 3 expands tasks), Claude will follow the eager path. Explicit "do NOT" constraints are needed to preserve lazy semantics.
- **Competitive analysis produces better designs** (2026-03-04): Fetching 2-3 similar systems and doing structured comparison yields more concrete improvements than brainstorming from scratch. Consider making this a pattern for design sessions involving skill/workflow redesign.
- **Brevity vs structure trade-off** (2026-03-04): GSD's discuss-phase is 5x longer than beastmode's design. The extra length is structured step definitions (gray areas, pacing, scope guardrails). Beastmode's brevity is a strength, but some omissions lose substance not just length. Target: add structure without matching GSD's verbosity.

### 2026-03-04: progressive-l1-docs
- **Disambiguate directional language early**: "L0 most detailed" was misinterpreted as "L0 has the most prose" when the user meant "L0 is the richest standalone summary." When users describe hierarchies with comparative adjectives, restate the interpretation back before proceeding.
- **Root entry point should be pure wiring**: CLAUDE.md works best as a manifest of @imports, not as a content file. Content belongs in PRODUCT.md (L0). This separation makes the loading hierarchy explicit and prevents the root file from becoming a dumping ground.
- **Fractal consistency beats special-casing**: When a structural pattern works for one domain, apply it uniformly to all domains (context, meta, state) without exceptions. The instinct to special-case individual domains adds complexity without value.
- **User vision may need multiple rounds to formalize**: The user had a clear directional vision but it took several iterative rounds to converge on the exact model (fractal L0/L1/L2). Budget design sessions for this convergence time rather than expecting the model to crystallize in the first exchange.

### 2026-03-04: implement-v2
- **Plan-implement contract gaps surface through competitive analysis**: Beastmode's /plan produces wave numbers and dependency fields, but /implement ignores them entirely. Fetching external systems (GSD, Superpowers) made this gap obvious. When redesigning a skill, always check what its upstream skill produces and whether the contract is honored.
- **Stale references survive longer than expected**: The implement execute phase still referenced `.agents/` paths from a pre-.beastmode/ era. Cross-phase path audits should be part of any skill restructure.

### 2026-03-04: parallel-wave-upgrade-path
- **Locked decisions can drift from implementation**: implement-v2 locked "parallel within wave" but implemented sequential with a "parallel is future" comment. When a locked decision is pragmatically deferred during implementation, the design doc should be updated to match reality. Treat locked decisions as a contract — if implementation breaks it, the design needs a revision, not just a code comment.

### 2026-03-04: hitl-gate-config
- **Research platform constraints before locking architecture**: The initial design assumed `/clear` could be issued programmatically. Web research revealed it's user-only, forcing a redesign from `/run` orchestrator to self-chaining transitions. Always verify platform capabilities before locking architectural decisions.
- **Concrete per-gate analysis eliminates bad abstractions**: Walking through each gate with "what does skip actually do here?" revealed `skip` was either dangerous (approvals) or redundant (transitions). Concrete case-by-case analysis beats abstract taxonomy debates for eliminating unnecessary complexity.

### 2026-03-04: worktree-session-discovery
- **Cross-session state loss is a design gap, not a bug**: When a mechanism relies on in-session context (like the feature name derived during /design), it will silently break across sessions. Any state that subsequent phases need must be either persisted to disk or re-derivable from arguments. Treat session boundaries as a hard reset.

### 2026-03-05: meta-hierarchy
- **HITL gates are easy to forget when restructuring data layers**: The initial design covered the L2 file split and retro classification but omitted HITL gates entirely. The user had to remind the designer about them. When a feature touches a write path that already has HITL gates (retro writes to meta), always check the existing gate inventory and carry them forward into the new design.
- **Deferred ideas should be challenged for inclusion**: Auto-promotion (learnings promoted to SOPs after 3+ sessions) was initially placed in Deferred Ideas but the user wanted it in scope. When a deferred idea is small enough to fit within the design's component model (retro-meta agent + sops-write gate), it should be included rather than deferred. Deferral should be reserved for ideas that require new components or significant complexity.
- **Applying existing patterns to neglected domains reveals structural debt**: The meta domain had flat L1 files with inline content while context had full L1/L2 hierarchy. Applying the fractal pattern uniformly surfaced that meta was accumulating unstructured content (learnings, overrides, SOPs all mixed). Structural consistency across domains is not just aesthetic — it enables better tooling (retro classification, HITL routing).
- **Three-category classification needs concrete definitions upfront**: Splitting meta into SOPs/overrides/learnings required explicit definitions to prevent ambiguous routing. When introducing new classification schemes, define each category with a one-liner and an example before designing the routing logic.
```

**Step 5: Verify**

Confirm all 3 files exist:
```bash
ls -la .beastmode/meta/design/
```
Expected: `sops.md`, `overrides.md`, `learnings.md`

---

### Task 1: Create L2 Files for Plan Phase (Migration)

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `.beastmode/meta/plan/sops.md`
- Create: `.beastmode/meta/plan/overrides.md`
- Create: `.beastmode/meta/plan/learnings.md`

**Step 1: Create the plan L2 directory**

```bash
mkdir -p .beastmode/meta/plan
```

**Step 2: Create sops.md (empty template)**

Write to `.beastmode/meta/plan/sops.md`:

```markdown
# Plan SOPs

Standard operating procedures for the plan phase.

## Procedures

<!-- SOPs added by retro classification or auto-promotion -->
```

**Step 3: Create overrides.md (empty template)**

Write to `.beastmode/meta/plan/overrides.md`:

```markdown
# Plan Overrides

Project-specific customizations for the plan phase.

## Active Overrides

<!-- Overrides added by retro classification or user -->
```

**Step 4: Migrate learnings from PLAN.md to learnings.md**

Read `.beastmode/meta/PLAN.md`. Extract `## Learnings` section. Write to `.beastmode/meta/plan/learnings.md`:

```markdown
# Plan Learnings

Friction and insights captured during plan retros.

- **Plan from design is straightforward when design is detailed** (2026-03-04): The design doc's "Components" section mapped 1:1 to plan tasks. Acceptance criteria transferred directly to verification steps. Investing in detailed design pays off in planning speed.
- **Research files can substitute for design docs** (2026-03-04): When a research file has comprehensive competitive analysis, concrete recommendations with priorities, and codebase context (as in readme-star-patterns), it contains all the inputs a plan needs. A formal design doc adds value for architectural decisions, not for content rewrites.
```

**Step 5: Verify**

```bash
ls -la .beastmode/meta/plan/
```
Expected: `sops.md`, `overrides.md`, `learnings.md`

---

### Task 2: Create L2 Files for Implement Phase (Migration)

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `.beastmode/meta/implement/sops.md`
- Create: `.beastmode/meta/implement/overrides.md`
- Create: `.beastmode/meta/implement/learnings.md`

**Step 1: Create the implement L2 directory**

```bash
mkdir -p .beastmode/meta/implement
```

**Step 2: Create sops.md (empty template)**

Write to `.beastmode/meta/implement/sops.md`:

```markdown
# Implement SOPs

Standard operating procedures for the implement phase.

## Procedures

<!-- SOPs added by retro classification or auto-promotion -->
```

**Step 3: Create overrides.md (empty template)**

Write to `.beastmode/meta/implement/overrides.md`:

```markdown
# Implement Overrides

Project-specific customizations for the implement phase.

## Active Overrides

<!-- Overrides added by retro classification or user -->
```

**Step 4: Migrate learnings from IMPLEMENT.md to learnings.md**

Read `.beastmode/meta/IMPLEMENT.md`. Extract `## Learnings` section. Write to `.beastmode/meta/implement/learnings.md`:

```markdown
# Implement Learnings

Friction and insights captured during implement retros.

### 2026-03-04: hitl-gate-config
- **File-isolated waves enable reliable parallel dispatch** (2026-03-04): When the plan accurately separates files across tasks within a wave, parallel agent dispatch works perfectly. All 4 waves in this session completed with 0 deviations. The /plan file isolation analysis (Wave 2 tasks each touching different skill directories) was the key enabler.
- **Annotation tasks are ideal for parallel subagents** (2026-03-04): Tasks that insert content at known locations in existing files (like HITL-GATE annotations) are predictable enough for subagents to execute without controller intervention. The pattern: give exact surrounding context + exact content to insert = reliable results.
```

**Step 5: Verify**

```bash
ls -la .beastmode/meta/implement/
```
Expected: `sops.md`, `overrides.md`, `learnings.md`

---

### Task 3: Create L2 Files for Validate Phase (Empty)

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `.beastmode/meta/validate/sops.md`
- Create: `.beastmode/meta/validate/overrides.md`
- Create: `.beastmode/meta/validate/learnings.md`

**Step 1: Create the validate L2 directory**

```bash
mkdir -p .beastmode/meta/validate
```

**Step 2: Create sops.md**

Write to `.beastmode/meta/validate/sops.md`:

```markdown
# Validate SOPs

Standard operating procedures for the validate phase.

## Procedures

<!-- SOPs added by retro classification or auto-promotion -->
```

**Step 3: Create overrides.md**

Write to `.beastmode/meta/validate/overrides.md`:

```markdown
# Validate Overrides

Project-specific customizations for the validate phase.

## Active Overrides

<!-- Overrides added by retro classification or user -->
```

**Step 4: Create learnings.md (empty — no existing learnings to migrate)**

Write to `.beastmode/meta/validate/learnings.md`:

```markdown
# Validate Learnings

Friction and insights captured during validate retros.

<!-- Learnings added by retro -->
```

**Step 5: Verify**

```bash
ls -la .beastmode/meta/validate/
```

---

### Task 4: Create L2 Files for Release Phase (Migration)

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `.beastmode/meta/release/sops.md`
- Create: `.beastmode/meta/release/overrides.md`
- Create: `.beastmode/meta/release/learnings.md`

**Step 1: Create the release L2 directory**

```bash
mkdir -p .beastmode/meta/release
```

**Step 2: Create sops.md**

Write to `.beastmode/meta/release/sops.md`:

```markdown
# Release SOPs

Standard operating procedures for the release phase.

## Procedures

<!-- SOPs added by retro classification or auto-promotion -->
```

**Step 3: Create overrides.md**

Write to `.beastmode/meta/release/overrides.md`:

```markdown
# Release Overrides

Project-specific customizations for the release phase.

## Active Overrides

<!-- Overrides added by retro classification or user -->
```

**Step 4: Migrate learnings from RELEASE.md to learnings.md**

Read `.beastmode/meta/RELEASE.md`. Extract `## Learnings` section. Write to `.beastmode/meta/release/learnings.md`:

```markdown
# Release Learnings

Friction and insights captured during release retros.

- **Version conflicts are structural, not accidental** (2026-03-04): Worktrees branch from older commits, so version files are always stale. Version-bearing files are limited to 3 (plugin.json, marketplace.json, session-start.sh) to minimize conflict surface.
- **Release retro must run before commit** (2026-03-04): Retro writes to `.beastmode/meta/` files. If retro runs after merge+cleanup (in checkpoint), those changes land on main uncommitted. Moving retro to 1-execute before the commit step ensures all outputs are captured.
- **Merge-only eliminates rebase conflicts** (2026-03-04): Rebasing replays each commit, so a single conflict can recur N times. Merge resolves everything once. Combined with reducing version files from 5 to 3 (dropping README badge and PRODUCT.md version), the release merge step is now conflict-free for typical feature branches.
```

**Step 5: Verify**

```bash
ls -la .beastmode/meta/release/
```

---

### Task 5: Rewrite All 5 Meta L1 Files to Progressive Format

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Tasks 0-4

**Files:**
- Modify: `.beastmode/meta/DESIGN.md`
- Modify: `.beastmode/meta/PLAN.md`
- Modify: `.beastmode/meta/IMPLEMENT.md`
- Modify: `.beastmode/meta/VALIDATE.md`
- Modify: `.beastmode/meta/RELEASE.md`

**Step 1: Rewrite DESIGN.md**

Replace entire contents of `.beastmode/meta/DESIGN.md` with:

```markdown
# Design Meta

Learnings from design phases. Key patterns: competitive analysis beats brainstorming for workflow redesign, detailed designs with locked decisions pay off in faster planning, fractal consistency beats special-casing, and HITL gates must be carried forward when restructuring write paths.

## SOPs
No design SOPs established yet. SOPs will be added by retro classification or auto-promoted from recurring learnings.
@design/sops.md

## Overrides
No project-specific design overrides yet. Overrides will be added by retro classification or user.
@design/overrides.md

## Learnings
Extensive design learnings spanning competitive analysis, fractal hierarchy patterns, HITL gate design, and cross-session state management. Most learnings from the 2026-03-04 batch of design sessions.
@design/learnings.md
```

**Step 2: Rewrite PLAN.md**

Replace entire contents of `.beastmode/meta/PLAN.md` with:

```markdown
# Plan Meta

Learnings from plan phases. Key pattern: investing in detailed design documents with component breakdowns and acceptance criteria makes planning straightforward — the design maps 1:1 to tasks.

## SOPs
No plan SOPs established yet. SOPs will be added by retro classification or auto-promoted from recurring learnings.
@plan/sops.md

## Overrides
No project-specific plan overrides yet. Overrides will be added by retro classification or user.
@plan/overrides.md

## Learnings
Two key learnings: detailed designs enable 1:1 task mapping, and research files can substitute for formal design docs when they contain sufficient context.
@plan/learnings.md
```

**Step 3: Rewrite IMPLEMENT.md**

Replace entire contents of `.beastmode/meta/IMPLEMENT.md` with:

```markdown
# Implement Meta

Learnings from implementation phases. Key pattern: markdown-only plans with file-isolated waves execute cleanly in parallel with zero deviations when the plan accurately captures file boundaries.

## SOPs
No implement SOPs established yet. SOPs will be added by retro classification or auto-promoted from recurring learnings.
@implement/sops.md

## Overrides
No project-specific implement overrides yet. Overrides will be added by retro classification or user.
@implement/overrides.md

## Learnings
Implementation learnings from hitl-gate-config: file-isolated waves enable reliable parallel dispatch, and annotation tasks are ideal for parallel subagents.
@implement/learnings.md
```

**Step 4: Rewrite VALIDATE.md**

Replace entire contents of `.beastmode/meta/VALIDATE.md` with:

```markdown
# Validate Meta

Learnings from validation phases. No notable patterns captured yet — validate learnings will accumulate as more validation cycles run.

## SOPs
No validate SOPs established yet. SOPs will be added by retro classification or auto-promoted from recurring learnings.
@validate/sops.md

## Overrides
No project-specific validate overrides yet. Overrides will be added by retro classification or user.
@validate/overrides.md

## Learnings
No notable learnings from validation phases yet.
@validate/learnings.md
```

**Step 5: Rewrite RELEASE.md**

Replace entire contents of `.beastmode/meta/RELEASE.md` with:

```markdown
# Release Meta

Learnings from release phases. Key patterns: worktrees branch from older commits so version files are always stale, merge-only strategy eliminates rebase conflicts, and retro must run before commit to capture all outputs.

## SOPs
No release SOPs established yet. SOPs will be added by retro classification or auto-promoted from recurring learnings.
@release/sops.md

## Overrides
No project-specific release overrides yet. Overrides will be added by retro classification or user.
@release/overrides.md

## Learnings
Three key learnings: version conflicts are structural (not accidental), retro must run before commit, and merge-only eliminates rebase conflicts.
@release/learnings.md
```

**Step 6: Verify**

Read each L1 file and confirm it follows the progressive format (summary + 3 section summaries + 3 @imports).

---

### Task 6: Update Retro-Meta Agent with Classification Protocol

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `agents/retro-meta.md`

**Step 1: Rewrite agents/retro-meta.md**

Replace entire contents with:

```markdown
# Meta Learnings Agent

Classify session findings into SOPs, overrides, or learnings for `.beastmode/meta/{phase}/`.

## Role

Review session artifacts to identify what worked, what didn't, and what patterns emerged. Classify each finding into one of three categories and check for auto-promotion opportunities.

## Categories

| Category | Definition | Example |
|----------|-----------|---------|
| **SOP** | Reusable procedure or best practice for this phase | "Always grep for old names when renaming" |
| **Override** | Project-specific rule that customizes phase behavior | "Use perplexity instead of WebSearch in this project" |
| **Learning** | Session-specific friction, insight, or pattern discovered | "Version conflicts are structural, not accidental" |

**Classification heuristics:**
- If it says "always" or "never" and applies to any project → SOP
- If it references this specific project's tools, config, or conventions → Override
- If it describes a one-time insight or friction point from this session → Learning

## Review Focus

1. **What worked well** — Patterns, approaches, or tools that were effective
2. **What to improve** — Friction points, mistakes, or inefficiencies
3. **Patterns discovered** — Reusable approaches worth remembering
4. **Skill gaps** — Knowledge that was missing and had to be discovered
5. **Automation opportunities** — Repetitive tasks that could be streamlined

## Auto-Promotion Detection

After classifying new findings, scan the existing `learnings.md` for the current phase:

1. Look for concepts that appear in 3+ different date-headed sections
2. Use semantic similarity — "always grep after renaming", "run grep for old names", and "search for stale references on rename" all count as the same concept
3. For each detected pattern, generate:
   - A proposed SOP text (concise, imperative, reusable)
   - List of source learning entries that would be annotated with `→ promoted to SOP`

## Artifact Sources

- Session artifacts (design docs, plan docs, implementation changes)
- Git diff from this phase
- Existing `.beastmode/meta/{phase}/learnings.md` (for auto-promotion scan)

## Output Format

Return findings classified by category:

```
## Findings

### SOPs
- **{title}**: {description}
- **{title}**: {description}

### Overrides
- **{title}**: {description}

### Learnings

### YYYY-MM-DD: {feature-name}
- **{title}**: {description}

### Auto-Promotions
- **Proposed SOP**: {proposed SOP text}
  - Source: {learning 1 reference}
  - Source: {learning 2 reference}
  - Source: {learning 3 reference}
```

If a category has no findings, include it with "None."

If nothing notable happened, return:

```
## Findings

### SOPs
None.

### Overrides
None.

### Learnings
No notable learnings from this phase. Session was routine.

### Auto-Promotions
None.
```

## Rules

- **Be concise** — bullets, not paragraphs
- **Be specific** — reference actual files, decisions, or patterns
- **No duplicates** — check existing content in all three L2 files first
- **Only notable items** — skip obvious or routine observations
- **Classify conservatively** — when in doubt, classify as Learning (lowest impact)
```

**Step 2: Verify**

Read `agents/retro-meta.md` and confirm it contains: Categories table, Classification heuristics, Auto-Promotion Detection section, and classified Output Format.

---

### Task 7: Update Retro Orchestrator with Tiered Write Routing

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `skills/_shared/retro.md`

**Step 1: Update retro.md**

Replace entire contents of `skills/_shared/retro.md` with:

```markdown
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

1. **Context Agent** — read prompt from `agents/retro-context.md`
   - Append: current phase name, paths to context docs, session artifacts
   - Reviews `.beastmode/context/{phase}/` docs for accuracy

2. **Meta Agent** — read prompt from `agents/retro-meta.md`
   - Append: current phase name, paths to meta L2 files, session artifacts
   - Classifies findings into SOPs, overrides, and learnings
   - Detects auto-promotion opportunities

Include in both agent prompts:

```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **Artifacts**: {list of design/plan doc paths}
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

## 5. Apply Changes

### 5.1 Learnings

<!-- HITL-GATE: retro.learnings-write | INTERACTIVE -->
@gate-check.md

- **human**: Show learnings to user, then auto-append to `.beastmode/meta/{phase}/learnings.md` under the appropriate date-headed section
- **auto**: Auto-append without showing

### 5.2 SOPs

<!-- HITL-GATE: retro.sops-write | APPROVAL -->
@gate-check.md

- **human**: Present each proposed SOP (including auto-promoted ones) and ask for approval before writing to `.beastmode/meta/{phase}/sops.md`
- **auto**: Auto-write all proposed SOPs

On approval of auto-promoted SOPs: annotate the source learning entries in `learnings.md` with `→ promoted to SOP`.

### 5.3 Overrides

<!-- HITL-GATE: retro.overrides-write | APPROVAL -->
@gate-check.md

- **human**: Present each proposed override and ask for approval before writing to `.beastmode/meta/{phase}/overrides.md`
- **auto**: Auto-write all proposed overrides

### 5.4 Context Changes

- **Context changes**: Present each proposed edit and ask for approval before applying
  - High confidence: "Apply this change? [Y/n]"
  - Medium/Low confidence: "Review suggested change: [apply / skip / edit]"

If no findings from either agent, report: "Phase retro: no changes needed."

## 6. Bottom-Up Summary Bubble

After applying L2 changes, propagate summaries upward:

1. **Update L1 summaries** — For each L1 file in the current domain (`context/{PHASE}.md`, `meta/{PHASE}.md`, `state/{PHASE}.md`):
   - Re-read all L2 @imported files
   - Rewrite the section summary (2-3 sentences) to reflect current L2 content
   - Rewrite the top-level summary paragraph to reflect all sections

2. **Prune stale entries** — In L2 "Related Decisions" sections:
   - Verify each linked state file still exists
   - Remove entries where the link target is missing
   - Flag entries where the one-liner no longer matches the linked file's goal

L0 (PRODUCT.md) updates are handled by /release step 8.5, not by the retro bubble.
```

**Step 2: Verify**

Read `skills/_shared/retro.md` and confirm: step 1 references L2 files, step 5 has three HITL-GATE annotations (learnings-write, sops-write, overrides-write), and step 5 routes writes to correct L2 file paths.

---

### Task 8: Update META.md Documentation

**Wave:** 3
**Parallel-safe:** true
**Depends on:** Task 5

**Files:**
- Modify: `.beastmode/META.md`

**Step 1: Update META.md**

Add a new section after "## File Conventions" that describes the meta domain structure. Insert before the end of file:

```markdown
## Meta Domain Structure

The meta domain follows the same fractal L1/L2 hierarchy as context. Each phase has three L2 category files:

| Category | File | Purpose | Write Path |
|----------|------|---------|-----------|
| **SOPs** | `meta/{phase}/sops.md` | Reusable procedures and best practices | Retro classification + auto-promotion (APPROVAL gate) |
| **Overrides** | `meta/{phase}/overrides.md` | Project-specific rules that customize phase behavior | Retro classification (APPROVAL gate) |
| **Learnings** | `meta/{phase}/learnings.md` | Session-specific friction, insights, patterns | Retro classification (INTERACTIVE gate, auto-append) |

**Auto-promotion**: When a learning concept appears in 3+ date-headed sections within a `learnings.md`, the retro agent proposes promoting it to an SOP. Promotion requires user approval via the `retro.sops-write` gate.

**HITL Gates**:
- `retro.learnings-write` | INTERACTIVE — learnings shown to user, auto-appended
- `retro.sops-write` | APPROVAL — SOPs require explicit user approval
- `retro.overrides-write` | APPROVAL — overrides require explicit user approval
```

**Step 2: Verify**

Read `.beastmode/META.md` and confirm the new section exists.

---

### Task 9: Update Architecture Documentation

**Wave:** 3
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/design/architecture.md:38`
- Modify: `.beastmode/context/design/architecture.md:120-127`
- Modify: `.beastmode/context/design/architecture.md:197-202`

**Step 1: Update Four Data Domains table**

In `.beastmode/context/design/architecture.md`, find line 38 and replace:

```
| **Meta** | How to improve (learnings, overrides) | `.beastmode/meta/` |
```

with:

```
| **Meta** | How to improve (SOPs, overrides, learnings) | `.beastmode/meta/` |
```

**Step 2: Update Retro data flow**

Find lines 120-127 and replace:

```
For Retro functionality (now in 3-checkpoint sub-phase):
```
```
3-checkpoint sub-phase triggers learnings capture
  ↓
Update .beastmode/meta/ with session insights
  ↓
Learnings inform future sessions via L1 loading
```

with:

```
For Retro functionality (now in 3-checkpoint sub-phase):
```
```
3-checkpoint sub-phase triggers retro-meta agent
  ↓
Agent classifies findings as SOP, override, or learning
  ↓
Tiered HITL gates: learnings (interactive), SOPs/overrides (approval)
  ↓
Writes routed to meta/{phase}/sops.md, overrides.md, or learnings.md
  ↓
Recurring learnings (3+ sessions) auto-promoted to SOPs
  ↓
Classified knowledge informs future sessions via L1 loading
```

**Step 3: Add Related Decisions entry**

At the end of the `## Related Decisions` section, add:

```
- Meta domain restructured to fractal L2 hierarchy. See [meta-hierarchy](../../state/design/2026-03-05-meta-hierarchy.md)
```

**Step 4: Verify**

Read the modified sections and confirm all three changes applied correctly.

---

### Task 10: Update Structure Documentation

**Wave:** 3
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/plan/structure.md:35-40`

**Step 1: Update meta directory layout**

In `.beastmode/context/plan/structure.md`, find lines 35-40 and replace:

```
│   └── meta/               # Self-improvement (learnings, overrides)
│       ├── DESIGN.md       # L1: Design learnings
│       ├── PLAN.md         # L1: Plan learnings
│       ├── IMPLEMENT.md    # L1: Implement learnings
│       ├── VALIDATE.md     # L1: Validate learnings
│       └── RELEASE.md      # L1: Release learnings
```

with:

```
│   └── meta/               # Self-improvement (SOPs, overrides, learnings)
│       ├── DESIGN.md       # L1: Design meta summary
│       ├── design/         # L2: sops.md, overrides.md, learnings.md
│       ├── PLAN.md         # L1: Plan meta summary
│       ├── plan/           # L2: sops.md, overrides.md, learnings.md
│       ├── IMPLEMENT.md    # L1: Implement meta summary
│       ├── implement/      # L2: sops.md, overrides.md, learnings.md
│       ├── VALIDATE.md     # L1: Validate meta summary
│       ├── validate/       # L2: sops.md, overrides.md, learnings.md
│       ├── RELEASE.md      # L1: Release meta summary
│       └── release/        # L2: sops.md, overrides.md, learnings.md
```

**Step 2: Verify**

Read the modified section and confirm the meta directory layout is updated.
