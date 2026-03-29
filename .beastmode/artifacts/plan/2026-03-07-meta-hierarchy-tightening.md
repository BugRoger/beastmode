# Meta Hierarchy Tightening Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Align META hierarchy format with CONTEXT hierarchy — rename insights→process, upstream→workarounds, reformat L1/L2 to mirror CONTEXT structure.

**Architecture:** Big-bang migration. Wave 1 renames directories and moves L3 files. Wave 2 rewrites L2 files per phase (parallel). Wave 3 rewrites L1 files, retro agent, and context docs (parallel). Wave 4 cleans up old files.

**Tech Stack:** Markdown, bash (git mv for renames)

**Design Doc:** `.beastmode/state/design/2026-03-07-meta-hierarchy-tightening.md`

---

### Task 1: Rename L3 directories and move files

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/meta/design/insights/` → `.beastmode/meta/design/process/`
- Modify: `.beastmode/meta/implement/insights/` → `.beastmode/meta/implement/process/`
- Modify: `.beastmode/meta/implement/upstream/` → `.beastmode/meta/implement/workarounds/`
- Modify: `.beastmode/meta/plan/insights/` → `.beastmode/meta/plan/process/`
- Modify: `.beastmode/meta/release/insights/` → `.beastmode/meta/release/process/`

**Step 1: Rename all insights/ directories to process/**

```bash
cd .beastmode/worktrees/meta-hierarchy-tightening
mv .beastmode/meta/design/insights .beastmode/meta/design/process
mv .beastmode/meta/implement/insights .beastmode/meta/implement/process
mv .beastmode/meta/plan/insights .beastmode/meta/plan/process
mv .beastmode/meta/release/insights .beastmode/meta/release/process
```

**Step 2: Rename all upstream/ directories to workarounds/**

```bash
mv .beastmode/meta/implement/upstream .beastmode/meta/implement/workarounds
```

Note: Only implement has an `upstream/` directory with L3 records. Other phases have no `upstream/` subdirectory (only flat `upstream.md` files).

**Step 3: Verify directory structure**

```bash
find .beastmode/meta -type d | sort
```

Expected: All directories named `process/` and `workarounds/`, no `insights/` or `upstream/` directories remaining.

---

### Task 2: Rewrite design phase L2 files

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 1

**Files:**
- Create: `.beastmode/meta/design/process.md`
- Create: `.beastmode/meta/design/workarounds.md`
- Delete: `.beastmode/meta/design/insights.md`
- Delete: `.beastmode/meta/design/upstream.md`

**Step 1: Write process.md**

Create `.beastmode/meta/design/process.md` with this exact content:

```markdown
# Design Process

Emerging process patterns from design phases. Ten topic clusters spanning competitive analysis, fractal consistency, HITL gate design, cross-session state, instruction visibility, scope management, L0 content scoping, agent organization, external documentation drift, and miscellaneous design patterns.

## Competitive Analysis
Research-informed design outperforms brainstorming. External reference points constrain the solution space and reveal integration gaps that internal review misses.
1. ALWAYS produce dated research artifacts from 3+ external sources before locking structural decisions
2. ALWAYS present structures as self-evident choices, not as imitations of other projects

## Fractal Consistency
Structural patterns should apply uniformly across domains. Mirroring existing algorithms constrains the design space productively and session-seeded content beats templates.
1. ALWAYS start from existing algorithms when building structurally analogous subsystems
2. ALWAYS seed new files from real session content, not generic templates

## HITL Gate Design
Gates require structural enforcement and single-mechanism decisions. Competing mechanisms on the same decision point create unpredictable behavior.
1. ALWAYS verify platform capabilities before locking architectural decisions
2. ALWAYS enumerate every instance in concrete tables for N-instance decisions
3. NEVER place competing gate mechanisms on the same decision point

## Instruction Visibility
Critical-path instructions must be visible markdown. HTML comments and @imported files lose priority against inline instructions on the critical path.
1. ALWAYS use visible markdown for critical-path instructions, not HTML comments
2. ALWAYS prefer inline over imported for execution-critical directives

## Scope Management
Explicit deferral and per-instance enumeration improve scope management. Users need multiple rounds to formalize vision. Deferred ideas should be challenged for inclusion.

## Cross-Session State
Session boundaries are a hard reset. Any state that subsequent phases need must be persisted to disk or re-derivable from arguments.

## L0 Content Scope
L0 should be persona + map, not operational manual. Operational details belong in skills. Pointer references beat content duplication.

## Agent Organization
"Spawned = agent" is the simplest classification rule. Naming conventions should encode workflow position. Dead code detection requires checking references, not existence.

## External Documentation Drift
External docs drift from internal knowledge hierarchy. The retro walker doesn't touch external docs. External-facing specs need periodic review.

## Miscellaneous Patterns
Root entry points should be pure wiring. Locked decisions can drift from implementation. Shared files are blind spots for phase-scoped refactors. Parsability constraints drive syntax design through multiple iterations.
1. ALWAYS include shared files (_shared/) in phase-scoped sweeps
```

**Step 2: Write workarounds.md**

Create `.beastmode/meta/design/workarounds.md` with this exact content:

```markdown
# Design Workarounds

No workarounds recorded for design phases.
```

**Step 3: Delete old files**

```bash
rm .beastmode/meta/design/insights.md
rm .beastmode/meta/design/upstream.md
```

**Step 4: Verify**

```bash
ls .beastmode/meta/design/
```

Expected: `process.md`, `workarounds.md`, `process/` directory. No `insights.md` or `upstream.md`.

---

### Task 3: Rewrite plan phase L2 files

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Create: `.beastmode/meta/plan/process.md`
- Create: `.beastmode/meta/plan/workarounds.md`
- Delete: `.beastmode/meta/plan/insights.md`
- Delete: `.beastmode/meta/plan/upstream.md`

**Step 1: Write process.md**

Create `.beastmode/meta/plan/process.md` with this exact content:

```markdown
# Plan Process

Emerging process patterns from plan phases. One topic cluster on design-to-plan mapping.

## Design-to-Plan Mapping
Detailed design documents with component breakdowns enable direct 1:1 mapping to plan tasks. Research artifacts can substitute for formal design docs when they contain comprehensive analysis and concrete recommendations.
```

**Step 2: Write workarounds.md**

Create `.beastmode/meta/plan/workarounds.md` with this exact content:

```markdown
# Plan Workarounds

No workarounds recorded for plan phases.
```

**Step 3: Delete old files**

```bash
rm .beastmode/meta/plan/insights.md
rm .beastmode/meta/plan/upstream.md
```

**Step 4: Verify**

```bash
ls .beastmode/meta/plan/
```

Expected: `process.md`, `workarounds.md`, `process/` directory.

---

### Task 4: Rewrite implement phase L2 files

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Create: `.beastmode/meta/implement/process.md`
- Create: `.beastmode/meta/implement/workarounds.md`
- Delete: `.beastmode/meta/implement/insights.md`
- Delete: `.beastmode/meta/implement/upstream.md`

**Step 1: Write process.md**

Create `.beastmode/meta/implement/process.md` with this exact content:

```markdown
# Implement Process

Emerging process patterns from implementation phases. Three topic clusters on parallel dispatch reliability, structural adaptation, and migration-as-validation.

## Parallel Dispatch
File-isolated waves enable reliable parallel dispatch. Pattern uniformity is the second key enabler — uniform transformation patterns scale to 11+ parallel subagents with zero deviations.
1. ALWAYS ensure file isolation across parallel wave tasks — plans must assign disjoint file sets

## Structural Adaptation
Heading depth must adapt to structural context but detection patterns must be portable across nesting depths. Demoted files should be preserved with status markers, not deleted.

## Migration as Validation
Clean migration execution confirms sound design. When all old data maps cleanly into the new structure, it validates that the target structure captures real relationships.
```

**Step 2: Write workarounds.md**

Create `.beastmode/meta/implement/workarounds.md` with this exact content:

```markdown
# Implement Workarounds

Three friction areas identified in the beastmode tool during implementation phases.

## Context Compaction State Loss
Context compaction drops incremental state updates. tasks.json shows tasks as "pending" despite completion. Verify state from filesystem artifacts, not from in-memory records.
1. ALWAYS verify task state from artifacts (file existence) rather than trusting tasks.json in long sessions

## Subagent State Coordination
Subagents cannot reliably write back to shared coordination files. Controllers must design for post-hoc reconciliation from filesystem evidence and return values.
1. ALWAYS design parallel dispatch for post-hoc reconciliation, not real-time status updates

## Plugin Cache Worktree Staleness
Plugin cache serves main-branch skill files, not worktree-local modifications. Features that modify skill files will encounter stale cache.
1. ALWAYS read skill files from worktree path when the feature modifies skill files
```

**Step 3: Delete old files**

```bash
rm .beastmode/meta/implement/insights.md
rm .beastmode/meta/implement/upstream.md
```

**Step 4: Verify**

```bash
ls .beastmode/meta/implement/
```

Expected: `process.md`, `workarounds.md`, `process/`, `workarounds/` directories.

---

### Task 5: Rewrite validate phase L2 files

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Create: `.beastmode/meta/validate/process.md`
- Create: `.beastmode/meta/validate/workarounds.md`
- Delete: `.beastmode/meta/validate/insights.md`
- Delete: `.beastmode/meta/validate/upstream.md`

**Step 1: Write process.md**

Create `.beastmode/meta/validate/process.md` with this exact content:

```markdown
# Validate Process

No process patterns recorded for validation phases yet.
```

**Step 2: Write workarounds.md**

Create `.beastmode/meta/validate/workarounds.md` with this exact content:

```markdown
# Validate Workarounds

No workarounds recorded for validation phases.
```

**Step 3: Delete old files**

```bash
rm .beastmode/meta/validate/insights.md
rm .beastmode/meta/validate/upstream.md
```

**Step 4: Verify**

```bash
ls .beastmode/meta/validate/
```

Expected: `process.md`, `workarounds.md`. No subdirectories (validate has no L3 records).

---

### Task 6: Rewrite release phase L2 files

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Create: `.beastmode/meta/release/process.md`
- Create: `.beastmode/meta/release/workarounds.md`
- Delete: `.beastmode/meta/release/insights.md`
- Delete: `.beastmode/meta/release/upstream.md`

**Step 1: Write process.md**

Create `.beastmode/meta/release/process.md` with this exact content:

```markdown
# Release Process

Emerging process patterns from release phases. Three topic clusters on version conflict management, squash merge workflow, and retro timing.

## Version Conflict Management
Version file staleness is structural to the worktree-branching model. Worktrees branch from older commits, so version files are always stale. Minimizing version-bearing files reduces conflict surface.

## Squash Merge Workflow
Squash merge supersedes merge-only. Archive tags preserve branch history that squash destroys on main. Step ordering matters when squash merge separates staging from committing.

## Retro Timing
Retro must run before release commit to capture all outputs. Documentation-only releases skip validate naturally. Retro findings catch internal inconsistencies that implementation and validate miss.
```

**Step 2: Write workarounds.md**

Create `.beastmode/meta/release/workarounds.md` with this exact content:

```markdown
# Release Workarounds

No workarounds recorded for release phases.
```

**Step 3: Delete old files**

```bash
rm .beastmode/meta/release/insights.md
rm .beastmode/meta/release/upstream.md
```

**Step 4: Verify**

```bash
ls .beastmode/meta/release/
```

Expected: `process.md`, `workarounds.md`, `process/` directory.

---

### Task 7: Rewrite all 5 L1 meta files

**Wave:** 3
**Parallel-safe:** true
**Depends on:** Tasks 2, 3, 4, 5, 6

**Files:**
- Modify: `.beastmode/meta/DESIGN.md`
- Modify: `.beastmode/meta/PLAN.md`
- Modify: `.beastmode/meta/IMPLEMENT.md`
- Modify: `.beastmode/meta/VALIDATE.md`
- Modify: `.beastmode/meta/RELEASE.md`

**Step 1: Rewrite DESIGN.md**

Replace entire content of `.beastmode/meta/DESIGN.md` with:

```markdown
# Design Meta

Process knowledge from design phases. Key patterns: research-informed design outperforms brainstorming, fractal consistency across domains beats special-casing, HITL gate design requires structural enforcement, instruction visibility on critical paths demands visible markdown, and mirroring existing algorithms constrains the design space productively.

## Process
Ten insight clusters spanning competitive analysis, fractal consistency, HITL gate design, cross-session state, instruction visibility, scope management, L0 content scope, agent organization, external documentation drift, and miscellaneous design patterns.
1. ALWAYS produce dated research artifacts from 3+ external sources before locking structural decisions — research-informed designs outperform brainstormed ones
2. ALWAYS enumerate every instance in concrete tables for N-instance decisions — catches edge cases that pattern descriptions miss
3. ALWAYS start from existing algorithms when building structurally analogous subsystems — constrains design space and ensures consistency
4. ALWAYS include shared files (_shared/) in phase-scoped sweeps — shared files are blind spots for phase-scoped refactors

## Workarounds
None recorded.
```

**Step 2: Rewrite PLAN.md**

Replace entire content of `.beastmode/meta/PLAN.md` with:

```markdown
# Plan Meta

Process knowledge from plan phases. Key pattern: detailed design documents with component breakdowns and acceptance criteria make planning straightforward — the design maps 1:1 to tasks.

## Process
One topic cluster on design-to-plan mapping. Detailed designs enable 1:1 task mapping; research files can substitute for formal design docs.

## Workarounds
None recorded.
```

**Step 3: Rewrite IMPLEMENT.md**

Replace entire content of `.beastmode/meta/IMPLEMENT.md` with:

```markdown
# Implement Meta

Process knowledge from implementation phases. Key pattern: markdown-only plans with file-isolated waves execute cleanly in parallel with zero deviations when the plan accurately captures file boundaries. Pattern uniformity across tasks is the second key enabler.

## Process
Three insight clusters on parallel dispatch reliability, structural adaptation, and migration-as-validation.
1. ALWAYS ensure file isolation across parallel wave tasks — plans must assign disjoint file sets to each task within a wave to enable reliable parallel dispatch

## Workarounds
Three friction areas: context compaction drops incremental state updates in long sessions, subagents cannot reliably write back to shared coordination files, and plugin cache serves main-branch skill files rather than worktree-local modifications.
1. ALWAYS verify task state from artifacts rather than trusting tasks.json in long sessions
2. ALWAYS design parallel dispatch for post-hoc reconciliation, not real-time status updates
3. ALWAYS read skill files from worktree path when the feature modifies skill files
```

**Step 4: Rewrite VALIDATE.md**

Replace entire content of `.beastmode/meta/VALIDATE.md` with:

```markdown
# Validate Meta

Process knowledge from validation phases. No notable patterns captured yet — insights will accumulate as more validation cycles run.

## Process
No process patterns recorded yet.

## Workarounds
None recorded.
```

**Step 5: Rewrite RELEASE.md**

Replace entire content of `.beastmode/meta/RELEASE.md` with:

```markdown
# Release Meta

Process knowledge from release phases. Key patterns: worktrees branch from older commits so version files are always stale, squash merge produces clean single-commit history, retro must run before commit to capture all outputs, and retro findings reliably catch inconsistencies.

## Process
Three insight clusters on version conflict management, squash merge workflow, and retro timing.

## Workarounds
None recorded.
```

**Step 6: Verify**

```bash
for f in .beastmode/meta/DESIGN.md .beastmode/meta/PLAN.md .beastmode/meta/IMPLEMENT.md .beastmode/meta/VALIDATE.md .beastmode/meta/RELEASE.md; do echo "=== $f ===" && head -1 "$f" && grep -c "^## " "$f"; done
```

Expected: Each file has exactly 2 `##` sections (Process and Workarounds).

---

### Task 8: Update retro agent

**Wave:** 3
**Depends on:** Task 1

**Files:**
- Modify: `agents/retro-meta.md`

**Step 1: Update domain references**

In `agents/retro-meta.md`, replace all occurrences of:
- `insights.md` → `process.md`
- `upstream.md` → `workarounds.md`
- `insights/` → `process/`
- `upstream/` → `workarounds/`
- `insights` (as domain name) → `process`
- `upstream` (as domain name) → `workarounds`
- `insight` (as classification) → `process`

Specifically:

1. In Algorithm section 3 (L2 Deep Check), replace:
   - `insights.md`, `upstream.md` → `process.md`, `workarounds.md`

2. In Algorithm section 4 (L3 Record Management):
   - Replace classification: `insight (process pattern, friction, effective approach) or upstream (beastmode tool behavior, limitations, workarounds)` → `process (process pattern, friction, effective approach) or workaround (beastmode tool behavior, limitations, workarounds)`
   - Replace paths: `meta/{phase}/insights/` and `meta/{phase}/upstream/` → `meta/{phase}/process/` and `meta/{phase}/workarounds/`

3. In Output Format section:
   - Replace `- **Domain**: insights | upstream` → `- **Domain**: process | workarounds`

4. In Classification Heuristics section:
   - Replace `**Insight**:` → `**Process**:`
   - Replace `**Upstream**:` → `**Workaround**:`
   - Replace `default to insight` → `default to process`

5. In Rules section, replace:
   - `**L1 format** — L1 has summary paragraph + Procedures (numbered ALWAYS/NEVER rules) + Domains summary` → `**L1 format** — L1 has summary paragraph + Process section (summary + numbered rules) + Workarounds section (summary + rules or "None recorded.")`

**Step 2: Verify no old references remain**

```bash
grep -n "insights\|upstream" agents/retro-meta.md
```

Expected: Zero matches (no remaining old domain names).

---

### Task 9: Update context docs vocabulary

**Wave:** 3
**Depends on:** Task 1

**Files:**
- Modify: `.beastmode/context/design/architecture/data-domains.md`
- Modify: `.beastmode/context/design/architecture/knowledge-hierarchy.md`
- Modify: `.beastmode/context/design/architecture/retro-promotion.md`
- Modify: `.beastmode/context/design/architecture.md`
- Modify: `.beastmode/context/DESIGN.md`

**Step 1: Update data-domains.md**

In `.beastmode/context/design/architecture/data-domains.md`, replace:
- `two L2 domains per phase: insights (process patterns) and upstream (beastmode feedback)` → `two L2 domains per phase: process (process patterns) and workarounds (beastmode feedback)`
- `Two-domain split (insights vs upstream)` → `Two-domain split (process vs workarounds)`

**Step 2: Update knowledge-hierarchy.md**

No changes needed — this file doesn't reference "insights" or "upstream" by name.

**Step 3: Update retro-promotion.md**

In `.beastmode/context/design/architecture/retro-promotion.md`, replace:
- `Two retro gates: retro.records (L3 creation/appends) and retro.promotions (L1/L2 upgrades)` — no change needed (gates reference action types, not domain names)
- `Two meta retro gates: retro.records (L3 creation/appends) and retro.promotions (L1/L2 upgrades)` — no change needed

Verify: does this file reference "insights" or "upstream"?

```bash
grep -n "insights\|upstream" .beastmode/context/design/architecture/retro-promotion.md
```

Only update if matches found.

**Step 4: Update architecture.md (L2 summary)**

In `.beastmode/context/design/architecture.md`, replace:
- `insights.md` → `process.md` (if present)
- `upstream.md` → `workarounds.md` (if present)
- `insights (emerging process patterns)` → `process (process patterns)`
- `upstream (beastmode feedback)` → `workarounds (beastmode feedback)`

Specifically in the Data Domains section:
- Replace `Meta uses two L2 domains per phase: \`insights.md\` (emerging process patterns) and \`upstream.md\` (beastmode feedback)` → `Meta uses two L2 domains per phase: \`process.md\` (process patterns) and \`workarounds.md\` (beastmode feedback)`

In the Retro Knowledge Promotion section:
- Replace `Update \`insights.md\` and \`upstream.md\` summaries` → `Update \`process.md\` and \`workarounds.md\` summaries` (if present)

**Step 5: Update DESIGN.md (L1 summary)**

In `.beastmode/context/DESIGN.md`, replace:
- `Meta domain uses progressive L1/L2/L3 hierarchy with two L2 domains (insights + upstream)` → `Meta domain uses progressive L1/L2/L3 hierarchy with two L2 domains (process + workarounds)`
- `3. Three data domains: State (feature workflow), Context (published knowledge), Meta (process knowledge with insights + upstream domains)` → `3. Three data domains: State (feature workflow), Context (published knowledge), Meta (process knowledge with process + workarounds domains)`

**Step 6: Update retro.md shared skill file**

In `skills/_shared/retro.md`, replace:
- `{insights count} insights, {upstream count} upstream` → `{process count} process, {workarounds count} workarounds`
- `Update \`insights.md\` and \`upstream.md\` summaries` → `Update \`process.md\` and \`workarounds.md\` summaries`

**Step 7: Verify no orphaned references**

```bash
grep -rn "insights\.\|upstream\." .beastmode/context/ .beastmode/meta/ agents/ skills/_shared/retro.md 2>/dev/null | grep -v "process/" | grep -v "workarounds/"
```

Expected: Zero matches for old domain names in context docs, meta docs, agent, and retro skill.

---

### Task 10: Final validation sweep

**Wave:** 4
**Depends on:** Tasks 7, 8, 9

**Files:**
- (read-only verification)

**Step 1: Check for orphaned references project-wide**

```bash
grep -rn "insights\.md\|upstream\.md" .beastmode/ agents/ skills/ 2>/dev/null
```

Expected: Zero matches.

**Step 2: Verify all process.md and workarounds.md exist**

```bash
for phase in design plan implement validate release; do
  echo "=== $phase ==="
  ls .beastmode/meta/$phase/process.md .beastmode/meta/$phase/workarounds.md 2>&1
done
```

Expected: All 10 files exist.

**Step 3: Verify L1 format**

```bash
for f in .beastmode/meta/DESIGN.md .beastmode/meta/PLAN.md .beastmode/meta/IMPLEMENT.md .beastmode/meta/VALIDATE.md .beastmode/meta/RELEASE.md; do
  echo "=== $f ==="
  grep "^## " "$f"
done
```

Expected: Each file has exactly `## Process` and `## Workarounds`.

**Step 4: Verify L3 directory structure**

```bash
find .beastmode/meta -type d | sort
```

Expected: Only `process/` and `workarounds/` directories. No `insights/` or `upstream/`.

**Step 5: Verify L3 file count unchanged**

```bash
find .beastmode/meta -name "*.md" -path "*/process/*" -o -name "*.md" -path "*/workarounds/*" | wc -l
```

Expected: Same count as pre-migration L3 files (~15).
