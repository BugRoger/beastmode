# Progressive Hierarchy Fix Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Fix the `.beastmode/` progressive knowledge hierarchy so L0 has four domain entry points, loading is lazy (L0 at boot, L1 by phase), and state tracking follows kanban semantics.

**Architecture:** Restructure L0 into PRODUCT.md (unchanged), CONTEXT.md (new), META.md (repurposed), STATE.md (new kanban). Move doc rules into CLAUDE.md. Convert state L1 files to full artifact indices. Add placeholder L2 files for validate/release.

**Tech Stack:** Markdown only — pure documentation restructuring.

**Design Doc:** [.beastmode/state/design/2026-03-06-hierarchy-fix.md](../design/2026-03-06-hierarchy-fix.md)

---

### Task 0: Create CONTEXT.md — New L0 Domain Entry

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `.beastmode/CONTEXT.md`

**Step 1: Create the file**

```markdown
# Context — How We Build

Architecture, conventions, and implementation knowledge organized by workflow phase.

## Design
Architecture and technology decisions for how we build beastmode. System follows a plugin architecture on Claude Code with markdown-first skill definitions, git worktree isolation, and four-domain knowledge organization.
@context/DESIGN.md

## Plan
Conventions and structure for implementation. Naming patterns, code style, directory layout, and where different types of files belong.
@context/PLAN.md

## Implement
Agent safety rules and testing strategy for implementation. Multi-agent collaboration requires explicit safety boundaries — never guess, always verify in code.
@context/IMPLEMENT.md

## Validate
Quality gates and verification strategy before release. Currently relies on manual verification via skill invocation and content inspection.
@context/VALIDATE.md

## Release
Release workflow and versioning conventions. Squash-per-release commits, archive tagging, version detection, changelog generation, and marketplace publishing.
@context/RELEASE.md
```

**Step 2: Verify**

Run: `cat .beastmode/CONTEXT.md | head -5`
Expected: `# Context — How We Build`

---

### Task 1: Repurpose META.md — L0 Domain Entry

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/META.md`

**Step 1: Replace META.md contents**

Replace the entire file with:

```markdown
# Meta — How We Improve

SOPs, overrides, and learnings captured through phase retros. Each phase has three L2 files: sops.md (reusable procedures), overrides.md (project-specific rules), learnings.md (session insights).

## Design
Learnings from design phases. Key patterns: competitive analysis beats brainstorming, detailed designs pay off in faster planning, fractal consistency beats special-casing, HITL gates must be carried forward when restructuring write paths.
@meta/DESIGN.md

## Plan
Learnings from plan phases. Key pattern: investing in detailed design documents with component breakdowns and acceptance criteria makes planning straightforward.
@meta/PLAN.md

## Implement
Learnings from implementation phases. Key pattern: markdown-only plans with file-isolated waves execute cleanly in parallel with zero deviations.
@meta/IMPLEMENT.md

## Validate
Learnings from validation phases. No notable patterns captured yet.
@meta/VALIDATE.md

## Release
Learnings from release phases. Key patterns: worktrees branch from older commits so version files are always stale, squash merge produces clean single-commit history.
@meta/RELEASE.md
```

**Step 2: Verify**

Run: `head -1 .beastmode/META.md`
Expected: `# Meta — How We Improve`

Verify doc rules are NOT present:
Run: `grep -c "Writing Guidelines\|Anti-Bloat\|File Conventions" .beastmode/META.md`
Expected: `0`

---

### Task 2: Create STATE.md — L0 Kanban Board

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `.beastmode/STATE.md`

**Step 1: Create the file**

Scan `.beastmode/worktrees/` for active features. Currently one active feature: `hierarchy-fix` on `feature/hierarchy-fix`.

```markdown
# State — Feature Lifecycle

Active features tracked through the workflow. Completed features drop off; full history in phase indices below.

## Active Features

| Feature | Phase | Branch | Started |
|---------|-------|--------|---------|
| hierarchy-fix | plan | feature/hierarchy-fix | 2026-03-06 |

## Recently Released

- v0.12.3 — The Banner Returns. See [2026-03-06-v0.12.3.md](state/release/2026-03-06-v0.12.3.md)
- v0.12.2 — The Cleanup. See [2026-03-06-v0.12.2.md](state/release/2026-03-06-v0.12.2.md)
- v0.12.1 — The Audit. See [2026-03-05-v0.12.1.md](state/release/2026-03-05-v0.12.1.md)
- v0.12.0. See [2026-03-05-v0.12.0.md](state/release/2026-03-05-v0.12.0.md)
- v0.11.2. See [2026-03-05-v0.11.2.md](state/release/2026-03-05-v0.11.2.md)

## Phase Indices

Full artifact history per workflow phase:

@state/DESIGN.md
@state/PLAN.md
@state/IMPLEMENT.md
@state/VALIDATE.md
@state/RELEASE.md
```

**Step 2: Verify**

Run: `grep -c "Active Features\|Recently Released\|Phase Indices" .beastmode/STATE.md`
Expected: `3`

---

### Task 3: Restructure CLAUDE.md — Wiring + Rules

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2

**Files:**
- Modify: `.beastmode/CLAUDE.md`

**Step 1: Replace CLAUDE.md contents**

Replace the entire file with L0 imports plus absorbed doc rules from META.md:

```markdown
@PRODUCT.md
@CONTEXT.md
@META.md
@STATE.md

## Knowledge Hierarchy

Every level follows the same pattern: summary + section summaries of children + @imports to the next level down.

- **L0**: Domain entry points (PRODUCT.md, CONTEXT.md, META.md, STATE.md) — always loaded at boot via this file
- **L1**: Phase summaries (`{domain}/{PHASE}.md`) — loaded by phase skills during prime
- **L2**: Detail files (`{domain}/{phase}/{detail}.md`) — full topic detail + "Related Decisions" linking to L3
- **L3**: State artifacts (`state/{phase}/{date}-{feature}.md`) — raw design docs, plans, validation records, release notes

**State exception:** State has no L2 layer. L0 (STATE.md) → L1 (phase indices) → L3 (artifacts). State is a timeline, not a knowledge tree.

**Loading model:** L0 at boot, L1 by phase during prime. Phases pull only what they need.

**L2 size limit:** 500 lines max. Split into new L2 file if exceeded.

## Writing Guidelines

- **Use absolute directives** — Start with "NEVER" or "ALWAYS" for non-negotiable rules
- **Lead with why** — Explain rationale before solution (1-3 bullets max)
- **Be concrete** — Include actual commands/code for project-specific patterns
- **Minimize examples** — One clear point per code block
- **Bullets over paragraphs** — Keep explanations concise
- **Action before theory** — Put immediate takeaways first

**Anti-Bloat:**
- Don't add "Warning Signs" to obvious rules
- Don't show bad examples for trivial mistakes
- Don't write paragraphs explaining what bullets can convey

## File Conventions

- **UPPERCASE.md** — Invariant meta files (always exist, same structure)
- **lowercase.md** — Variant files (plans, research docs, date-prefixed)

## Meta Domain Structure

Each phase has three L2 category files: sops.md, overrides.md, learnings.md.

**Auto-promotion**: When a learning appears in 3+ date-headed sections, retro proposes promoting it to SOP (requires approval).

**HITL Gates**:
- `retro.learnings-write` | INTERACTIVE — auto-appended
- `retro.sops-write` | APPROVAL — requires explicit approval
- `retro.overrides-write` | APPROVAL — requires explicit approval

## Bottom-Up Retro Bubble

3-checkpoint retro walks L2 → L1 → L0: update detail, re-summarize parent, re-summarize grandparent. Verify linked files exist, prune stale entries, add new.
```

**Step 2: Verify**

Run: `head -4 .beastmode/CLAUDE.md`
Expected: Exactly `@PRODUCT.md`, `@CONTEXT.md`, `@META.md`, `@STATE.md` (one per line)

Verify no L1 imports remain:
Run: `grep -c "context/DESIGN\|meta/DESIGN\|state/DESIGN" .beastmode/CLAUDE.md`
Expected: `0`

---

### Task 4: Create Placeholder L2 Files

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `.beastmode/context/validate/quality-gates.md`
- Create: `.beastmode/context/release/versioning.md`
- Modify: `.beastmode/context/VALIDATE.md`
- Modify: `.beastmode/context/RELEASE.md`

**Step 1: Create context/validate/ directory and quality-gates.md**

```bash
mkdir -p .beastmode/context/validate
```

```markdown
# Quality Gates

## Purpose

Defines quality gate criteria for the validate phase.

## Gates

<!-- Quality gate definitions will be added as formal gates emerge beyond manual verification. -->

## Related Decisions

<!-- No L3 artifacts linked yet. -->
```

**Step 2: Create versioning.md**

The directory `.beastmode/context/release/` already exists (empty). Write:

```markdown
# Versioning

## Purpose

Documents versioning strategy, commit message format, and archive tagging.

## Version Strategy

<!-- Versioning strategy will be documented as the release process stabilizes. -->

## Commit Message Format

<!-- Release commit format: `Release vX.Y.Z — Title` with categorized Features/Fixes/Artifacts sections. -->

## Related Decisions

<!-- No L3 artifacts linked yet. -->
```

**Step 3: Update context/VALIDATE.md**

Replace entire file:

```markdown
# Validate Context

Quality gates and verification strategy before release. The /validate skill runs project-specific checks (tests, lint, type checks) and requires user approval before proceeding to release.

## Quality Gates
Quality gate definitions — criteria, thresholds, and pass/fail rules for the validate phase.
@validate/quality-gates.md
```

**Step 4: Update context/RELEASE.md**

Replace entire file:

```markdown
# Release Context

Release workflow and versioning conventions. Squash-per-release commits collapse feature branches into one commit on main. Feature branch tips preserved via archive tags. Handles version detection, commit categorization, changelog generation, marketplace publishing, worktree merge/cleanup, and PRODUCT.md rollup.

## Versioning
Versioning strategy, commit message format, and archive tagging conventions.
@release/versioning.md
```

**Step 5: Verify**

Run: `ls .beastmode/context/validate/quality-gates.md .beastmode/context/release/versioning.md`
Expected: Both files listed.

Run: `grep "@validate/quality-gates.md" .beastmode/context/VALIDATE.md`
Expected: `@validate/quality-gates.md`

Run: `grep "@release/versioning.md" .beastmode/context/RELEASE.md`
Expected: `@release/versioning.md`

---

### Task 5: State L1 — Full Design Index

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/state/DESIGN.md`

**Step 1: Replace with full artifact index**

Replace entire file with a complete one-liner-per-artifact index. Group by date for readability:

```markdown
# Design State

57 design documents. Full artifact index below.

## 2026-03-06
- Progressive hierarchy fix. See [2026-03-06-hierarchy-fix.md](design/2026-03-06-hierarchy-fix.md)
- Skill cleanup — gate syntax convergence. See [2026-03-06-skill-cleanup.md](design/2026-03-06-skill-cleanup.md)
- Worktree detection fix. See [2026-03-06-worktree-detection-fix.md](design/2026-03-06-worktree-detection-fix.md)
- Banner visibility fix. See [2026-03-06-banner-visibility-fix.md](design/2026-03-06-banner-visibility-fix.md)

## 2026-03-05
- Dynamic persona greetings. See [2026-03-05-dynamic-persona-greetings.md](design/2026-03-05-dynamic-persona-greetings.md)
- Squash per release. See [2026-03-05-squash-per-release.md](design/2026-03-05-squash-per-release.md)
- Dynamic retro walkers. See [2026-03-05-dynamic-retro-walkers.md](design/2026-03-05-dynamic-retro-walkers.md)
- HITL adherence. See [2026-03-05-hitl-adherence.md](design/2026-03-05-hitl-adherence.md)
- Meta hierarchy. See [2026-03-05-meta-hierarchy.md](design/2026-03-05-meta-hierarchy.md)
- Key differentiators. See [2026-03-05-key-differentiators.md](design/2026-03-05-key-differentiators.md)
- README differentiators. See [2026-03-05-readme-differentiators.md](design/2026-03-05-readme-differentiators.md)
- Roadmap audit. See [2026-03-05-roadmap-audit.md](design/2026-03-05-roadmap-audit.md)
- Design approval summary. See [2026-03-05-design-approval-summary.md](design/2026-03-05-design-approval-summary.md)
- Ungated HITL fixes. See [2026-03-05-ungated-hitl-fixes.md](design/2026-03-05-ungated-hitl-fixes.md)

## 2026-03-04
- Progressive L1 docs. See [2026-03-04-progressive-l1-docs.md](design/2026-03-04-progressive-l1-docs.md)
- Skill anatomy refactor. See [2026-03-04-skill-anatomy-refactor.md](design/2026-03-04-skill-anatomy-refactor.md)
- Git branching strategy. See [2026-03-04-git-branching-strategy.md](design/2026-03-04-git-branching-strategy.md)
- HITL gate config. See [2026-03-04-hitl-gate-config.md](design/2026-03-04-hitl-gate-config.md)
- Implement v2. See [2026-03-04-implement-v2.md](design/2026-03-04-implement-v2.md)
- Design phase v2. See [2026-03-04-design-phase-v2.md](design/2026-03-04-design-phase-v2.md)
- Lean prime refactor. See [2026-03-04-lean-prime-refactor.md](design/2026-03-04-lean-prime-refactor.md)
- Agents to beastmode migration. See [2026-03-04-agents-to-beastmode-migration.md](design/2026-03-04-agents-to-beastmode-migration.md)
- Beastmode command. See [2026-03-04-beastmode-command.md](design/2026-03-04-beastmode-command.md)
- Plan skill improvements. See [2026-03-04-plan-skill-improvements.md](design/2026-03-04-plan-skill-improvements.md)
- Task runner. See [2026-03-04-task-runner.md](design/2026-03-04-task-runner.md)
- Lazy task expansion. See [2026-03-04-lazy-task-expansion.md](design/2026-03-04-lazy-task-expansion.md)
- Task runner lazy expansion. See [2026-03-04-task-runner-lazy-expansion.md](design/2026-03-04-task-runner-lazy-expansion.md)
- Parallel wave upgrade path. See [2026-03-04-parallel-wave-upgrade-path.md](design/2026-03-04-parallel-wave-upgrade-path.md)
- Worktree session discovery. See [2026-03-04-worktree-session-discovery.md](design/2026-03-04-worktree-session-discovery.md)
- Fix auto transitions. See [2026-03-04-fix-auto-transitions.md](design/2026-03-04-fix-auto-transitions.md)
- Changelog. See [2026-03-04-changelog.md](design/2026-03-04-changelog.md)
- Product MD rollup. See [2026-03-04-product-md-rollup.md](design/2026-03-04-product-md-rollup.md)
- README rework. See [2026-03-04-readme-rework.md](design/2026-03-04-readme-rework.md)
- Release merge fix. See [2026-03-04-release-merge-fix.md](design/2026-03-04-release-merge-fix.md)
- Release retro commit. See [2026-03-04-release-retro-commit.md](design/2026-03-04-release-retro-commit.md)
- Release skill restore. See [2026-03-04-release-skill-restore.md](design/2026-03-04-release-skill-restore.md)
- Release version sync. See [2026-03-04-release-version-sync.md](design/2026-03-04-release-version-sync.md)
- Remove agents refs. See [2026-03-04-remove-agents-refs.md](design/2026-03-04-remove-agents-refs.md)
- Remove session tracking. See [2026-03-04-remove-session-tracking.md](design/2026-03-04-remove-session-tracking.md)
- Restore phase retro. See [2026-03-04-restore-phase-retro.md](design/2026-03-04-restore-phase-retro.md)
- Vision README consolidation. See [2026-03-04-vision-readme-consolidation.md](design/2026-03-04-vision-readme-consolidation.md)

## 2026-03-03
- Vision alignment. See [2026-03-03-vision-alignment.md](design/2026-03-03-vision-alignment.md)

## 2026-03-02
- Phase research. See [2026-03-02-phase-research.md](design/2026-03-02-phase-research.md)
- Research agent enhancement. See [2026-03-02-research-agent-enhancement.md](design/2026-03-02-research-agent-enhancement.md)
- Session banner. See [2026-03-02-session-banner.md](design/2026-03-02-session-banner.md)

## 2026-03-01
- Bootstrap discovery v2. See [2026-03-01-bootstrap-discovery-v2.md](design/2026-03-01-bootstrap-discovery-v2.md)
- Bootstrap prefill. See [2026-03-01-bootstrap-prefill.md](design/2026-03-01-bootstrap-prefill.md)
- Implement skill refactor. See [2026-03-01-implement-skill-refactor.md](design/2026-03-01-implement-skill-refactor.md)
- Phase context report. See [2026-03-01-phase-context-report.md](design/2026-03-01-phase-context-report.md)
- Prime makeover. See [2026-03-01-prime-makeover.md](design/2026-03-01-prime-makeover.md)
- Remove verify phase. See [2026-03-01-remove-verify-phase.md](design/2026-03-01-remove-verify-phase.md)
- Retro prime review. See [2026-03-01-retro-prime-review.md](design/2026-03-01-retro-prime-review.md)
- Retro session paths. See [2026-03-01-retro-session-paths.md](design/2026-03-01-retro-session-paths.md)
- Session tracking. See [2026-03-01-session-tracking.md](design/2026-03-01-session-tracking.md)
- Skill refactor. See [2026-03-01-skill-refactor.md](design/2026-03-01-skill-refactor.md)
- Unified cycle commit. See [2026-03-01-unified-cycle-commit.md](design/2026-03-01-unified-cycle-commit.md)
- Agent to agents rename. See [2026-03-01-agent-to-agents-rename.md](design/2026-03-01-agent-to-agents-rename.md)
```

**Step 2: Verify**

Run: `grep -c "^- " .beastmode/state/DESIGN.md`
Expected: `57`

---

### Task 6: State L1 — Full Plan, Validate, Implement, Release Indices

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/state/PLAN.md`
- Modify: `.beastmode/state/IMPLEMENT.md`
- Modify: `.beastmode/state/VALIDATE.md`
- Modify: `.beastmode/state/RELEASE.md`

**Step 1: Replace state/PLAN.md**

Same structure as DESIGN.md: full one-liner-per-artifact index grouped by date. 55 plan documents. List every `.md` file in `state/plan/` (exclude `.tasks.json` files).

**Step 2: Replace state/IMPLEMENT.md**

```markdown
# Implement State

Implementation tracked via `.tasks.json` files alongside plans in `state/plan/`. No separate implement directory — task state persists in plan task files.
```

**Step 3: Replace state/VALIDATE.md**

Full one-liner-per-artifact index grouped by date. 34 validation records. List every `.md` file in `state/validate/`.

**Step 4: Replace state/RELEASE.md**

Full one-liner-per-artifact index grouped by date. 38 release notes. List every `.md` file in `state/release/`.

**Step 5: Verify**

Run: `grep -c "^- " .beastmode/state/PLAN.md`
Expected: `55`

Run: `grep -c "^- " .beastmode/state/VALIDATE.md`
Expected: `34`

Run: `grep -c "^- " .beastmode/state/RELEASE.md`
Expected: `38`

---

### Task 7: Delete state/status/ Directory

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Delete: `.beastmode/state/status/product-md-rollup.md`
- Delete: `.beastmode/state/status/` (directory)

**Step 1: Remove the directory**

```bash
rm -rf .beastmode/state/status/
```

**Step 2: Verify**

Run: `ls .beastmode/state/status/ 2>&1`
Expected: Error or "No such file or directory"

---

### Task 8: Hierarchy Reconciliation

**Wave:** 4
**Depends on:** Task 3, Task 4, Task 5, Task 6, Task 7

**Files:**
- (Read-only verification — no files modified)

**Step 1: Verify CLAUDE.md imports resolve**

Check that each @import in CLAUDE.md points to an existing file:
```bash
cd .beastmode
for f in PRODUCT.md CONTEXT.md META.md STATE.md; do
  if [ -f "$f" ]; then echo "OK: $f"; else echo "MISSING: $f"; fi
done
```
Expected: All OK.

**Step 2: Verify L0 → L1 chains**

Check CONTEXT.md links to all 5 context L1 files:
```bash
grep -c "@context/" .beastmode/CONTEXT.md
```
Expected: `5`

Check META.md links to all 5 meta L1 files:
```bash
grep -c "@meta/" .beastmode/META.md
```
Expected: `5`

Check STATE.md links to all 5 state L1 files:
```bash
grep -c "@state/" .beastmode/STATE.md
```
Expected: `5`

**Step 3: Verify no orphaned files**

Run a reconciliation: every `.md` in `.beastmode/` at L0/L1/L2 level should be reachable from CLAUDE.md through the chain. L3 state artifacts are reachable through L1 indices.

```bash
cd .beastmode
echo "=== L0 files ==="
ls *.md
echo "=== Unreferenced context L2 ==="
for f in context/*/; do
  ls "$f"*.md 2>/dev/null | while read l2; do
    l1=$(dirname "$l2" | xargs basename | tr '[:lower:]' '[:upper:]')
    grep -q "$(basename $l2)" "context/$l1.md" 2>/dev/null || echo "ORPHAN: $l2"
  done
done
echo "=== Unreferenced meta L2 ==="
for f in meta/*/; do
  ls "$f"*.md 2>/dev/null | while read l2; do
    l1=$(dirname "$l2" | xargs basename | tr '[:lower:]' '[:upper:]')
    grep -q "$(basename $l2)" "meta/$l1.md" 2>/dev/null || echo "ORPHAN: $l2"
  done
done
```

**Step 4: Spot-check state indices**

```bash
cd .beastmode
design_actual=$(ls state/design/*.md | wc -l | tr -d ' ')
design_indexed=$(grep -c "^- " state/DESIGN.md)
echo "Design: $design_actual actual, $design_indexed indexed"
```

Expected: Counts match for all phases.
