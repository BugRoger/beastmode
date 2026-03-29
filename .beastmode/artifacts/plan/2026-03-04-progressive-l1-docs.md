# Progressive L1 Docs Implementation Plan

**Goal:** Fix the broken meta layer and restructure all UPPERCASE L1 files as fractal progressive enhancements — summary + section summaries + @imports at every level.

**Architecture:** New `.beastmode/CLAUDE.md` manifest wires all L1 files into sessions. PRODUCT.md becomes the richest L0 standalone summary. L1 files get progressive format. L2 detail files gain "Related Decisions" sections linking to L3 state artifacts. Retro agents maintain hierarchy via bottom-up bubble.

**Tech Stack:** Markdown files only. No code changes.

**Design Doc:** [progressive-l1-docs](../design/2026-03-04-progressive-l1-docs.md)

---

## Task 0: Create `.beastmode/CLAUDE.md` Manifest

**Files:**
- Create: `.beastmode/CLAUDE.md`

**Step 1: Create the manifest file**

```markdown
@PRODUCT.md
@META.md
@context/DESIGN.md
@context/PLAN.md
@context/IMPLEMENT.md
@context/VALIDATE.md
@context/RELEASE.md
@meta/DESIGN.md
@meta/PLAN.md
@meta/IMPLEMENT.md
@meta/VALIDATE.md
@meta/RELEASE.md
@state/DESIGN.md
@state/PLAN.md
@state/IMPLEMENT.md
@state/VALIDATE.md
@state/RELEASE.md
```

Pure @imports only. No prose. Include META.md (writing guidelines) alongside PRODUCT.md as L0 files.

**Step 2: Verify**

Run: `cat .beastmode/CLAUDE.md | wc -l`
Expected: 17 lines (one @import per line)

---

## Task 1: Simplify Root `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Replace entire content with:**

```markdown
@.beastmode/CLAUDE.md

## Prime Directives

- When you see SessionStart hook output in your system context, display it as a greeting at the start of the conversation
```

Removes all direct `.beastmode/` imports. Single `@.beastmode/CLAUDE.md` reference + Prime Directives.

**Step 2: Verify**

Run: `grep -c "^@" CLAUDE.md`
Expected: `1` (only the single .beastmode/CLAUDE.md import)

---

## Task 2: Enrich `PRODUCT.md` as L0

**Files:**
- Modify: `.beastmode/PRODUCT.md`

**Step 1: Rewrite PRODUCT.md as richest standalone project summary**

Keep existing structure but enrich with comprehensive overview. The file should stand alone as a complete project description for any agent starting cold:

```markdown
# Product

Beastmode is a workflow system that turns Claude Code into a disciplined engineering partner through opinionated workflow patterns. It provides a structured five-phase workflow (design → plan → implement → validate → release) with context persistence across sessions and a self-improvement meta layer.

## Vision

Turn Claude Code into a disciplined engineering partner through opinionated workflow patterns.

## Goals

- Structured phases (design → plan → implement → validate → release) with consistent sub-phase anatomy (prime → execute → validate → checkpoint)
- Context persistence across sessions via `.beastmode/` artifact storage organized as Product, Context, State, and Meta domains
- Self-improvement through meta layer — retro phases capture learnings that inform future sessions
- Progressive knowledge hierarchy — L0 (PRODUCT.md) provides richest standalone summary, L1 files provide domain summaries, L2 files provide full detail, L3 state artifacts provide provenance

## How It Works

Each skill (/design, /plan, /implement, /validate, /release) follows the same four sub-phases: prime loads context, execute does the work, validate checks quality, checkpoint saves artifacts and captures learnings. Features flow through `.beastmode/state/` directories as they progress through the workflow. Git worktrees provide isolation during implementation.
```

**Step 2: Verify**

Run: `wc -l .beastmode/PRODUCT.md`
Expected: ~18-22 lines. Rich enough to understand the project cold.

---

## Task 3: Rewrite Context L1 Files (Progressive Format)

**Files:**
- Modify: `.beastmode/context/DESIGN.md`
- Modify: `.beastmode/context/PLAN.md`
- Modify: `.beastmode/context/IMPLEMENT.md`
- Modify: `.beastmode/context/VALIDATE.md`
- Modify: `.beastmode/context/RELEASE.md`

**Step 1: Rewrite `context/DESIGN.md`**

```markdown
# Design Context

Architecture and technology decisions for how we build beastmode. The system follows a plugin architecture on Claude Code with markdown-first skill definitions, git worktree isolation for implementation, and a four-domain knowledge organization (Product, Context, State, Meta).

## Architecture
System design with fractal L0/L1/L2/L3 knowledge hierarchy, four data domains (Product/Context/State/Meta), worktree isolation for implementation, unified cycle commits, and artifact-based context persistence across sessions.
@design/architecture.md

## Tech Stack
Claude Code plugin platform with markdown + YAML frontmatter for skill definitions. No runtime dependencies — pure agentic workflow system interpreted directly by Claude Code.
@design/tech-stack.md
```

**Step 2: Rewrite `context/PLAN.md`**

```markdown
# Plan Context

Conventions and structure for implementation. Defines naming patterns, code style, project-specific conventions, and the directory layout where different types of files belong.

## Conventions
Naming patterns (UPPERCASE.md for invariant, lowercase.md for variant), skill manifest pattern with YAML frontmatter, phase file rules (numbered steps, imperative voice), shared functionality rules, and anti-patterns to avoid.
@plan/conventions.md

## Structure
Directory layout with `.beastmode/` as central context hub, `skills/` for agent workflows, `agents/` for subagent documentation. Key file locations for entry points, configuration, core logic, and knowledge base.
@plan/structure.md
```

**Step 3: Rewrite `context/IMPLEMENT.md`**

```markdown
# Implement Context

Agent safety rules and testing strategy for implementation. Multi-agent collaboration requires explicit safety boundaries — never guess, always verify in code.

## Agents
Multi-agent safety rules: never stash, never switch branches, never modify worktrees unless explicitly requested. Git workflow for commits, pushes, and worktree context verification. Feature workflow with branch naming and release ownership.
@implement/agents.md

## Testing
Verification via brownfield discovery on real codebases. Success criteria: context L2 files populated with project-specific content, no placeholder patterns remaining. Critical paths: brownfield execution, parallel agent spawning, content merge, atomic file writes.
@implement/testing.md
```

**Step 4: Rewrite `context/VALIDATE.md`**

```markdown
# Validate Context

Quality gates and verification strategy before release. Currently relies on manual verification via skill invocation and content inspection.

<!-- No L2 files yet — add quality gate definitions as they emerge -->
```

**Step 5: Rewrite `context/RELEASE.md`**

```markdown
# Release Context

Release workflow and versioning conventions. Currently handles version detection, commit categorization, changelog generation, plugin marketplace updates, and worktree cleanup.

<!-- No L2 files yet — add versioning and changelog format docs as they emerge -->
```

**Step 6: Verify**

Run: `for f in .beastmode/context/{DESIGN,PLAN,IMPLEMENT,VALIDATE,RELEASE}.md; do echo "=== $f ==="; head -3 "$f"; echo; done`
Expected: Each file starts with `# {Phase} Context` followed by a summary paragraph.

---

## Task 4: Rewrite Meta L1 Files (Progressive Format)

**Files:**
- Modify: `.beastmode/meta/DESIGN.md`
- Modify: `.beastmode/meta/PLAN.md`
- Modify: `.beastmode/meta/IMPLEMENT.md`
- Modify: `.beastmode/meta/VALIDATE.md`
- Modify: `.beastmode/meta/RELEASE.md`

Meta L1 files have a different structure — they contain learnings directly (no L2 @imports). Convert to progressive format: summary of key learnings at top, then sections with the actual learnings below.

**Step 1: Rewrite `meta/DESIGN.md`**

```markdown
# Design Meta

Learnings from design phases. Key patterns: competitive analysis beats brainstorming for workflow redesign, detailed designs with locked decisions pay off in faster planning, and fractal consistency (applying the same pattern across all domains) beats special-casing.

## Defaults

<!-- From plugin -->

## Project Overrides

<!-- User additions -->

## Learnings

- **Parse vs Execute contradiction** (2026-03-04): When a prompt has two mechanisms that touch the same data (Step 1 parses tasks, Step 3 expands tasks), Claude will follow the eager path. Explicit "do NOT" constraints are needed to preserve lazy semantics.
- **Competitive analysis produces better designs** (2026-03-04): Fetching 2-3 similar systems and doing structured comparison yields more concrete improvements than brainstorming from scratch. Consider making this a pattern for design sessions involving skill/workflow redesign.
- **Brevity vs structure trade-off** (2026-03-04): GSD's discuss-phase is 5x longer than beastmode's design. The extra length is structured step definitions (gray areas, pacing, scope guardrails). Beastmode's brevity is a strength, but some omissions lose substance not just length. Target: add structure without matching GSD's verbosity.

### 2026-03-04: progressive-l1-docs
- **Disambiguate directional language early**: "L0 most detailed" was misinterpreted as "L0 has the most prose" when the user meant "L0 is the richest standalone summary." When users describe hierarchies with comparative adjectives, restate the interpretation back before proceeding.
- **Root entry point should be pure wiring**: CLAUDE.md works best as a manifest of @imports, not as a content file. Content belongs in PRODUCT.md (L0). This separation makes the loading hierarchy explicit and prevents the root file from becoming a dumping ground.
- **Fractal consistency beats special-casing**: When a structural pattern works for one domain, apply it uniformly to all domains (context, meta, state) without exceptions. The instinct to special-case individual domains adds complexity without value.
- **User vision may need multiple rounds to formalize**: The user had a clear directional vision but it took several iterative rounds to converge on the exact model (fractal L0/L1/L2). Budget design sessions for this convergence time rather than expecting the model to crystallize in the first exchange.
```

**Step 2: Rewrite `meta/PLAN.md`**

```markdown
# Plan Meta

Learnings from plan phases. Key pattern: investing in detailed design documents with component breakdowns and acceptance criteria makes planning straightforward — the design maps 1:1 to tasks.

## Defaults

<!-- From plugin -->

## Project Overrides

<!-- User additions -->

## Learnings

- **Plan from design is straightforward when design is detailed** (2026-03-04): The design doc's "Components" section mapped 1:1 to plan tasks. Acceptance criteria transferred directly to verification steps. Investing in detailed design pays off in planning speed.
```

**Step 3: Rewrite `meta/IMPLEMENT.md`**

```markdown
# Implement Meta

Learnings from implementation phases. No notable patterns captured yet.

## Defaults

<!-- From plugin -->

## Project Overrides

<!-- User additions -->

## Learnings

<!-- From /retro -->
```

**Step 4: Rewrite `meta/VALIDATE.md`**

```markdown
# Validate Meta

Learnings from validation phases. No notable patterns captured yet.

## Defaults

<!-- From plugin -->

## Project Overrides

<!-- User additions -->

## Learnings

<!-- From /retro -->
```

**Step 5: Rewrite `meta/RELEASE.md`**

```markdown
# Release Meta

Learnings from release phases. Key pattern: worktrees branch from older commits so version files are always stale — the release flow must sync with main before bumping.

## Defaults

<!-- From plugin -->

## Project Overrides

<!-- User additions -->

## Learnings

- **Version conflicts are structural, not accidental** (2026-03-04): Worktrees branch from older commits, so version files are always stale. The release flow must sync with main before bumping. Also, `hooks/session-start.sh` was missing from the version bump list — all version-bearing files must be enumerated explicitly.
```

**Step 6: Verify**

Run: `for f in .beastmode/meta/{DESIGN,PLAN,IMPLEMENT,VALIDATE,RELEASE}.md; do echo "=== $f ==="; head -3 "$f"; echo; done`
Expected: Each file starts with `# {Phase} Meta` followed by a summary paragraph.

---

## Task 5: Rewrite State L1 Files (Progressive Format)

**Files:**
- Modify: `.beastmode/state/DESIGN.md`
- Modify: `.beastmode/state/PLAN.md`
- Modify: `.beastmode/state/IMPLEMENT.md`
- Modify: `.beastmode/state/VALIDATE.md`
- Modify: `.beastmode/state/RELEASE.md`

State L1 files should summarize what's in each state directory. They link to the L2 state artifact directories.

**Step 1: Rewrite `state/DESIGN.md`**

```markdown
# Design State

30 design documents spanning bootstrap discovery, skill refactors, workflow improvements, and meta-layer fixes. Recent designs focus on skill anatomy standardization (task runner, lazy expansion), git branching strategy, and progressive L1 documentation.

## Recent
- Progressive L1 docs — fractal knowledge hierarchy. See [2026-03-04-progressive-l1-docs.md](design/2026-03-04-progressive-l1-docs.md)
- Plan skill improvements. See [2026-03-04-plan-skill-improvements.md](design/2026-03-04-plan-skill-improvements.md)
- Design phase v2 — gray areas, scope guardrails. See [2026-03-04-design-phase-v2.md](design/2026-03-04-design-phase-v2.md)
- Lean prime refactor — 0-prime read-only. See [2026-03-04-lean-prime-refactor.md](design/2026-03-04-lean-prime-refactor.md)
- Git branching strategy — feature branches. See [2026-03-04-git-branching-strategy.md](design/2026-03-04-git-branching-strategy.md)
```

**Step 2: Rewrite `state/PLAN.md`**

```markdown
# Plan State

25 implementation plans with task persistence files. Plans cover the full range from bootstrap discovery and skill refactors to workflow improvements and release tooling.

## Recent
- Progressive L1 docs. See [2026-03-04-progressive-l1-docs.md](plan/2026-03-04-progressive-l1-docs.md)
- Plan skill improvements. See [2026-03-04-plan-skill-improvements.md](plan/2026-03-04-plan-skill-improvements.md)
- Design phase v2. See [2026-03-04-design-phase-v2.md](plan/2026-03-04-design-phase-v2.md)
- Lean prime refactor. See [2026-03-04-lean-prime-refactor.md](plan/2026-03-04-lean-prime-refactor.md)
- Remove session tracking. See [2026-03-04-remove-session-tracking.md](plan/2026-03-04-remove-session-tracking.md)
```

**Step 3: Rewrite `state/IMPLEMENT.md`**

```markdown
# Implement State

Implementation artifacts live alongside plan task files. No separate implement tracking directory — task state is tracked in `.tasks.json` files within `state/plan/`.

<!-- Implementation tracking is embedded in plan task files -->
```

**Step 4: Rewrite `state/VALIDATE.md`**

```markdown
# Validate State

8 validation records covering agent migration, beastmode command, release skill, git branching, session tracking removal, lazy task expansion, design phase v2, and plan skill improvements.

## Recent
- Plan skill improvements. See [2026-03-04-plan-skill-improvements.md](validate/2026-03-04-plan-skill-improvements.md)
- Design phase v2. See [2026-03-04-design-phase-v2.md](validate/2026-03-04-design-phase-v2.md)
- Remove session tracking. See [2026-03-04-remove-session-tracking.md](validate/2026-03-04-remove-session-tracking.md)
- Lazy task expansion. See [2026-03-04-lazy-task-expansion.md](validate/2026-03-04-lazy-task-expansion.md)
```

**Step 5: Rewrite `state/RELEASE.md`**

```markdown
# Release State

12 releases from v0.1.12 through v0.3.6. Version history tracks the evolution from initial bootstrap through skill refactors, workflow standardization, and meta-layer improvements.

## Recent
- v0.3.6. See [2026-03-04-v0.3.6.md](release/2026-03-04-v0.3.6.md)
- v0.3.5. See [2026-03-04-v0.3.5.md](release/2026-03-04-v0.3.5.md)
- v0.3.4. See [2026-03-04-v0.3.4.md](release/2026-03-04-v0.3.4.md)
- v0.3.3. See [2026-03-04-v0.3.3.md](release/2026-03-04-v0.3.3.md)
- v0.3.2. See [2026-03-04-v0.3.2.md](release/2026-03-04-v0.3.2.md)
```

**Step 6: Verify**

Run: `for f in .beastmode/state/{DESIGN,PLAN,IMPLEMENT,VALIDATE,RELEASE}.md; do echo "=== $f ==="; head -3 "$f"; echo; done`
Expected: Each file starts with `# {Phase} State` followed by a summary paragraph.

---

## Task 6: Add Related Decisions to L2 Detail Files

**Files:**
- Modify: `.beastmode/context/design/architecture.md`
- Modify: `.beastmode/context/design/tech-stack.md`
- Modify: `.beastmode/context/plan/conventions.md`
- Modify: `.beastmode/context/plan/structure.md`
- Modify: `.beastmode/context/implement/agents.md`
- Modify: `.beastmode/context/implement/testing.md`

**Step 1: Add "Related Decisions" section to `architecture.md`**

Append to end of file:

```markdown
## Related Decisions
- Bootstrap discovery auto-populates context. See [bootstrap-discovery-v2](../../state/design/2026-03-01-bootstrap-discovery-v2.md)
- Unified cycle commit reduces noise. See [unified-cycle-commit](../../state/design/2026-03-01-unified-cycle-commit.md)
- Skill anatomy refactored to 4 sub-phases. See [skill-anatomy-refactor](../../state/design/2026-03-04-skill-anatomy-refactor.md)
- Git branching with feature worktrees. See [git-branching-strategy](../../state/design/2026-03-04-git-branching-strategy.md)
- Progressive L1 docs with fractal hierarchy. See [progressive-l1-docs](../../state/design/2026-03-04-progressive-l1-docs.md)
```

Also update the "Knowledge Architecture" section (L0/L1/L2 Hierarchy) to describe the progressive enhancement model:

Replace the current L0/L1/L2 description with:

```markdown
### Knowledge Hierarchy (Progressive Enhancement)

Each level follows the same fractal pattern: summary + section summaries of children + @imports to the next level.

- **L0**: `PRODUCT.md` — Richest standalone project summary. Sufficient for any agent starting cold.
- **L1**: Phase summaries (`{domain}/{PHASE}.md`) — Domain summary + section summaries per L2 + @imports. Loaded via `.beastmode/CLAUDE.md` manifest.
- **L2**: Detail files (`{domain}/{phase}/{detail}.md`) — Full topic detail + "Related Decisions" linking to L3 artifacts.
- **L3**: State artifacts (`state/{phase}/{date}-{feature}.md`) — Raw design docs, plans, validation records, release notes.

`.beastmode/CLAUDE.md` is a pure manifest (@imports only, no prose) that wires all L0 and L1 files into sessions.
```

**Step 2: Add "Related Decisions" section to `tech-stack.md`**

Append:

```markdown
## Related Decisions
- Claude Code is the mandatory platform. See [session-tracking](../../state/design/2026-03-01-session-tracking.md)
- Markdown-first with no runtime dependencies. See [bootstrap-prefill](../../state/design/2026-03-01-bootstrap-prefill.md)
```

**Step 3: Add "Related Decisions" section to `conventions.md`**

Append:

```markdown
## Related Decisions
- Skill anatomy standardized to 4 sub-phases. See [skill-anatomy-refactor](../../state/design/2026-03-04-skill-anatomy-refactor.md)
- Skill refactor established current patterns. See [skill-refactor](../../state/design/2026-03-01-skill-refactor.md)
- Phase context report added to all skills. See [phase-context-report](../../state/design/2026-03-01-phase-context-report.md)
```

**Step 4: Add "Related Decisions" section to `structure.md`**

Append:

```markdown
## Related Decisions
- Agents migrated to beastmode namespace. See [agents-to-beastmode-migration](../../state/design/2026-03-04-agents-to-beastmode-migration.md)
- Prime refactored to read-only. See [lean-prime-refactor](../../state/design/2026-03-04-lean-prime-refactor.md)
- Progressive L1 docs restructure. See [progressive-l1-docs](../../state/design/2026-03-04-progressive-l1-docs.md)
```

**Step 5: Add "Related Decisions" section to `agents.md`**

Append:

```markdown
## Related Decisions
- Agent safety rules formalized. See [implement-skill-refactor](../../state/design/2026-03-01-implement-skill-refactor.md)
- Git branching strategy for feature workflow. See [git-branching-strategy](../../state/design/2026-03-04-git-branching-strategy.md)
```

**Step 6: Add "Related Decisions" section to `testing.md`**

Append:

```markdown
## Related Decisions
- Bootstrap discovery v2 defined testing approach. See [bootstrap-discovery-v2](../../state/design/2026-03-01-bootstrap-discovery-v2.md)
```

**Step 7: Verify**

Run: `grep -l "Related Decisions" .beastmode/context/**/*.md | wc -l`
Expected: `6` (all six L2 files)

---

## Task 7: Update Retro for Bottom-Up Bubble

**Files:**
- Modify: `skills/_shared/retro.md`
- Modify: `agents/retro-context.md`

**Step 1: Add bottom-up bubble step to `skills/_shared/retro.md`**

After the existing "## 5. Apply Changes" section, add a new section:

```markdown
## 6. Bottom-Up Summary Bubble

After applying L2 changes, propagate summaries upward:

1. **Update L1 summaries** — For each L1 file in the current domain (`context/{PHASE}.md`, `meta/{PHASE}.md`, `state/{PHASE}.md`):
   - Re-read all L2 @imported files
   - Rewrite the section summary (2-3 sentences) to reflect current L2 content
   - Rewrite the top-level summary paragraph to reflect all sections

2. **Update L0 summary** — If L1 changes were significant:
   - Re-read PRODUCT.md
   - Update the "How It Works" or relevant section to reflect L1 changes
   - Skip if changes are minor (e.g., only one-liner additions to L2)

3. **Prune stale entries** — In L2 "Related Decisions" sections:
   - Verify each linked state file still exists
   - Remove entries where the link target is missing
   - Flag entries where the one-liner no longer matches the linked file's goal
```

**Step 2: Add hierarchy awareness to `agents/retro-context.md`**

After the existing "## Review Focus" section, add:

```markdown
## Hierarchy Awareness

Context docs follow a progressive enhancement hierarchy. When reviewing:

1. **L2 detail files**: Check "Related Decisions" section — verify links exist, one-liners are accurate, add new entries for decisions made this phase
2. **L1 summary files**: Check section summaries match their L2 @imports — summaries should be 2-3 sentences capturing the current L2 content
3. **Report hierarchy drift**: If an L1 summary no longer matches its L2 content, flag as a finding
```

**Step 3: Verify**

Run: `grep -c "Bottom-Up" skills/_shared/retro.md`
Expected: `1`

---

## Task 8: Update Architecture Docs

**Files:**
- Modify: `.beastmode/context/design/architecture.md`

This is handled as part of Task 6 Step 1 — the knowledge architecture section update. No separate task needed.

**Note:** Task 6 Step 1 already includes both the "Related Decisions" section AND the knowledge hierarchy rewrite. This task is a no-op placeholder for traceability.

---

## Task 9: Verify End-to-End

**Step 1: Verify import chain**

Run: `grep "^@" CLAUDE.md` — should show single `.beastmode/CLAUDE.md`
Run: `grep "^@" .beastmode/CLAUDE.md` — should show 17 imports
Run: `grep "^@" .beastmode/context/DESIGN.md` — should show L2 @imports

**Step 2: Verify no orphaned imports**

Run: `grep "^@" .beastmode/CLAUDE.md | sed 's/^@//' | while read f; do [ -f ".beastmode/$f" ] || echo "MISSING: $f"; done`
Expected: No output (all import targets exist)

**Step 3: Spot-check progressive format**

Verify each domain has the pattern: summary paragraph → section summaries → @imports (for context) or summary paragraph → learnings (for meta) or summary paragraph → recent list (for state).
