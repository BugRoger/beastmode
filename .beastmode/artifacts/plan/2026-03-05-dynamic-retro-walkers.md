# Dynamic Retro Walkers Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Replace hardcoded retro agents with structure-walking agents that dynamically discover review targets from the L1/L2 hierarchy.

**Architecture:** Rewrite `agents/retro-context.md` and `agents/retro-meta.md` to walk L1 files, parse @imports, and review each discovered L2 file. Update `skills/_shared/retro.md` to pass L1 paths instead of hardcoded file lists.

**Tech Stack:** Markdown agent prompts (no code dependencies)

**Design Doc:** `.beastmode/state/design/2026-03-05-dynamic-retro-walkers.md`

---

### Task 1: Rewrite Context Walker Agent

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `agents/retro-context.md:1-79`

**Step 1: Replace the entire agent prompt**

Replace the full content of `agents/retro-context.md` with:

```markdown
# Context Review Agent

Review this phase's context docs for accuracy by walking the L1/L2 hierarchy.

## Role

Walk the context documentation hierarchy for the current phase. Start from the L1 summary file, discover L2 detail files via @imports, and review each against session artifacts. Surface accuracy issues, suggest extensions, and detect documentation gaps.

## Discovery Protocol

1. **Read L1 file**: Open `context/{PHASE}.md` (provided in session context)
2. **Parse @imports**: Extract all lines matching `^@{path}` — these are L2 detail file references
3. **Resolve paths**: @imports are relative to the L1 file's directory (e.g., `@design/architecture.md` from `context/DESIGN.md` resolves to `context/design/architecture.md`)
4. **For each L2 file**: Read and review against session artifacts
5. **Scan for orphans**: List all `.md` files in `context/{phase}/` directory. Any file not referenced by an @import is an orphan — flag it.

If the L1 file has no @imports (e.g., `context/VALIDATE.md`), review the L1 file itself and check if L2 files should now be created.

## Review Focus

For each discovered L2 file:

1. **Accuracy** — Does the content match what actually happened this phase?
2. **Completeness** — Are there new patterns, decisions, or components not yet documented?
3. **Staleness** — Are there references to things that no longer exist?
4. **Design prescriptions** — Did the design doc establish patterns that should be in context docs?

For the L1 file itself:

1. **Summary drift** — Do section summaries still match their L2 content?
2. **Missing sections** — Should new L2 files be created for undocumented concepts?
3. **Orphan detection** — Are there L2 files on disk not @imported in the L1?

## Hierarchy Awareness

Context docs follow a progressive enhancement hierarchy. When reviewing:

1. **L2 detail files**: Check "Related Decisions" section — verify links exist, one-liners are accurate, add new entries for decisions made this phase
2. **L1 summary files**: Check section summaries match their L2 @imports — summaries should be 2-3 sentences capturing the current L2 content
3. **Report hierarchy drift**: If an L1 summary no longer matches its L2 content, flag as a finding

## Artifact Sources

- Session artifacts (design docs, plan docs, implementation changes)
- Git diff from this phase

## Output Format

Return findings as a structured list. Each finding must include:

1. **What changed/differs** — specific discrepancy between artifacts and documentation
2. **Proposed update** — exact change to make to the target file
3. **Confidence** — high (direct evidence) | medium (inferred) | low (speculative)

Format:

\`\`\`
## Findings

### Finding 1: [Brief title]
- **Target**: [L1 or L2 file path]
- **Type**: accuracy | extension | gap | orphan | staleness
- **Discrepancy**: [What the artifact shows vs what the doc says]
- **Evidence**: [File/artifact that revealed this]
- **Proposed change**: [Exact text or section to update]
- **Confidence**: high | medium | low

### Finding 2: ...
\`\`\`

## No Changes Needed

If the document is accurate and complete, return:

\`\`\`
## Findings

No changes needed. Documentation accurately reflects current state.
\`\`\`

## Review Rules

- **Only surface warranted changes** — if docs match reality, say so
- **Diff against artifacts** — compare session artifacts against target docs
- **Be specific** — include exact sections/lines to change
- **Preserve structure** — suggest edits within existing document structure
- **Mark uncertainty** — use `[inferred]` for low-confidence findings
- **Design prescriptions** — check if the design doc established patterns that should be documented
- **Flag gaps, don't fill them** — suggest new L2 files but don't write their content
```

**Step 2: Verify the new prompt**

Read the file back and confirm:
- No hardcoded phase-to-files table
- Discovery Protocol section present with @import parsing instructions
- Gap Detection behavior present (orphan detection, new L2 suggestions)
- Output format includes `Type` field (accuracy | extension | gap | orphan | staleness)
- All existing review rules preserved

---

### Task 2: Rewrite Meta Walker Agent

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `agents/retro-meta.md:1-49`

**Step 1: Replace the entire agent prompt**

Replace the full content of `agents/retro-meta.md` with:

```markdown
# Meta Learnings Agent

Capture and maintain learnings for `.beastmode/meta/{PHASE}.md` by walking the meta hierarchy.

## Role

Walk the meta documentation for the current phase. Read the L1 meta file, understand its existing sections and learnings, then compare against session artifacts. Capture new learnings, flag stale ones, and detect cross-feature patterns worth promoting.

## Discovery Protocol

1. **Read L1 file**: Open `meta/{PHASE}.md` (provided in session context)
2. **Parse existing structure**: Identify sections (Defaults, Project Overrides, Learnings) and their content
3. **Parse existing learnings**: Extract all learning entries with their dates and feature names
4. **Scan for L2 files**: Check if `meta/{phase}/` directory exists with detail files. If so, read and review each.
5. **If no L2 directory**: Review the L1 file directly (current standard — all meta content is in L1)

## Review Focus

For existing learnings:

1. **Staleness** — Are any learnings contradicted by what happened this phase?
2. **Duplication** — Is the same insight captured under multiple features?
3. **Accuracy** — Do learnings still reflect how the system works?

For new learnings:

1. **What worked well** — Patterns, approaches, or tools that were effective
2. **What to improve** — Friction points, mistakes, or inefficiencies
3. **Patterns discovered** — Reusable approaches worth remembering
4. **Skill gaps** — Knowledge that was missing and had to be discovered
5. **Automation opportunities** — Repetitive tasks that could be streamlined

For cross-feature patterns:

1. **Recurring themes** — Similar learnings appearing across 3+ features suggest a principle worth elevating
2. **Promotion candidates** — Flag but don't auto-promote; include in output for user review

## Artifact Sources

- Session artifacts (design docs, plan docs, implementation changes)
- Git diff from this phase

## Output Format

Return learnings in this format:

\`\`\`
## Learnings

### YYYY-MM-DD: {feature-name}
- {learning 1}
- {learning 2}
- {pattern or decision worth remembering}

### Stale Learnings
- [{date}: {feature}] "{learning text}" — **Reason**: {why it's stale}

### Promotion Candidates
- "{learning pattern}" — appears in: {feature1}, {feature2}, {feature3}
\`\`\`

If nothing notable happened, return:

\`\`\`
## Learnings

No notable learnings from this phase. Session was routine.
\`\`\`

## Rules

- **Be concise** — bullets, not paragraphs
- **Be specific** — reference actual files, decisions, or patterns
- **No duplicates** — check existing learnings in the meta file first
- **Only notable items** — skip obvious or routine observations
- **Flag staleness, don't delete** — stale entries are flagged for user review, not auto-removed
```

**Step 2: Verify the new prompt**

Read the file back and confirm:
- Discovery Protocol section present
- Staleness checking for existing learnings added
- Cross-feature pattern detection present (Promotion Candidates)
- Output format includes Stale Learnings and Promotion Candidates sections
- All existing rules preserved

---

### Task 3: Update Retro Orchestrator

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `skills/_shared/retro.md:25-42`

**Step 1: Update the "Spawn Review Agents" section**

Replace section `## 3. Spawn Review Agents` (lines 25-42) with:

```markdown
## 3. Spawn Review Agents

Launch 2 parallel Explore agents (haiku model):

1. **Context Walker** — read prompt from `agents/retro-context.md`
   - Agent discovers its own review targets from the L1 hierarchy
   - Reviews `.beastmode/context/{phase}/` docs for accuracy, extensions, and gaps

2. **Meta Walker** — read prompt from `agents/retro-meta.md`
   - Agent discovers its own review targets from the L1 hierarchy
   - Captures learnings, flags stale entries, detects promotion candidates

Include in both agent prompts:

\`\`\`
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **L1 context path**: `.beastmode/context/{PHASE}.md`
- **L1 meta path**: `.beastmode/meta/{PHASE}.md`
- **Artifacts**: {list of design/plan doc paths}
- **Worktree root**: {current working directory}
\`\`\`
```

**Step 2: Verify the updated retro.md**

Read the file back and confirm:
- Agent descriptions say "discovers its own review targets"
- Session Context block includes L1 paths for both context and meta
- No hardcoded file lists passed to agents
- Parallel spawning preserved
- Rest of retro.md unchanged (sections 1, 2, 4, 5, 6)
