# PRODUCT.md Release Rollup — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Make PRODUCT.md authoritative by adding a release-time rollup step, restructuring PRODUCT.md to 5 sections, and removing L0 from the retro bubble.

**Architecture:** Three file changes — add step 8.5 to release execute phase, remove L0 from retro bubble, restructure PRODUCT.md with Capabilities section. Release owns L1→L0 propagation; retro keeps L2→L1.

**Tech Stack:** Markdown skill definitions (no runtime dependencies)

**Design Doc:** `.beastmode/state/design/2026-03-04-product-md-rollup.md`

---

### Task 0: Restructure PRODUCT.md to 5 sections

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `.beastmode/PRODUCT.md:1-19`

**Step 1: Rewrite PRODUCT.md with 5 sections**

Replace the entire content of `.beastmode/PRODUCT.md` with:

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

## Capabilities

- **Five-phase workflow**: Design → plan → implement → validate → release with consistent 4-step sub-phase anatomy (prime → execute → validate → checkpoint)
- **Collaborative design**: Interactive gray area identification, multi-option proposals, and user approval gates before any implementation begins
- **Bite-sized planning**: Design components decomposed into wave-ordered, file-isolated tasks with complete code and exact commands
- **Parallel wave execution**: Implementation tasks dispatched in parallel within waves when file isolation analysis confirms no overlaps
- **Git worktree isolation**: Feature work happens in isolated worktrees created at design time, inherited by all phases, merged clean by /release
- **HITL gate configuration**: Configurable human-in-the-loop gates (auto/interactive/approval) across all workflow phases via config.yaml
- **Brownfield discovery**: Auto-populate project context by spawning parallel exploration agents against existing codebases
- **Fractal knowledge hierarchy**: L0/L1/L2/L3 progressive loading with bottom-up retro bubble to keep documentation accurate
- **Self-improving retro**: Each phase checkpoint captures meta learnings and verifies context doc accuracy via parallel review agents
- **Unified cycle commits**: All phase artifacts accumulate uncommitted in worktree; /release owns the single commit + merge + cleanup
- **Release automation**: Version detection, commit categorization, changelog generation, marketplace publishing, and PRODUCT.md rollup

## How It Works

Each skill (/design, /plan, /implement, /validate, /release) follows the same four sub-phases: prime loads context, execute does the work, validate checks quality, checkpoint saves artifacts and captures learnings. Features flow through `.beastmode/state/` directories as they progress through the workflow. Git worktrees provide isolation — created at /design, inherited through /plan and /implement, merged by /release. The retro sub-phase propagates changes upward through the L2→L1 knowledge hierarchy, while /release rolls up L1 summaries into this L0 document.

## Current Version

v0.5.2 — 17 releases
```

**Step 2: Verify**

Read `.beastmode/PRODUCT.md` and confirm:
- 5 sections present: Vision, Goals, Capabilities, How It Works, Current Version
- Capabilities has 11 entries with bold labels
- No placeholder patterns remain

---

### Task 1: Add PRODUCT.md rollup step to /release

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/1-execute.md:111-128`

**Step 1: Insert step 8.5 between Phase Retro (step 8) and Commit (step 9)**

After the line `@../_shared/retro.md` (line 113) and before `## 9. Commit Release Changes` (line 115), insert:

```markdown

## 8.5. Update PRODUCT.md

Roll up L1 summaries and release features into `.beastmode/PRODUCT.md`.

1. Read current `.beastmode/PRODUCT.md`
2. Read all L1 domain summaries (`context/DESIGN.md`, `context/PLAN.md`, `context/IMPLEMENT.md`, `context/VALIDATE.md`, `context/RELEASE.md`, `meta/DESIGN.md`, `meta/PLAN.md`, `meta/IMPLEMENT.md`, `meta/VALIDATE.md`, `meta/RELEASE.md`, `state/DESIGN.md`, `state/PLAN.md`, `state/IMPLEMENT.md`, `state/VALIDATE.md`, `state/RELEASE.md`)
3. Read the release notes generated in step 5
4. Update **Capabilities** section:
   - Add new capabilities from this release's `feat:` commits
   - Remove capabilities for features that were dropped
   - Keep existing entries that are still accurate
   - Format: `- **Bold label**: One-sentence description`
5. Update **How It Works** section if the release changes workflow mechanics
6. Update **Current Version** to the new version and release count

<!-- HITL-GATE: release.product-md-approval | CONDITIONAL -->
@../_shared/gate-check.md

**Significance check:**
- If only Current Version changed → auto-apply silently
- If Capabilities or How It Works changed → present the before/after diff for user approval

- **auto**: Claude auto-applies all changes and logs: "Gate `release.product-md-approval` → auto: updated PRODUCT.md with N new capabilities"
```

**Step 2: Verify numbering**

The existing steps 9-12 keep their numbers — step 8.5 uses a half-step to avoid renumbering. Verify the step numbering reads: 1, 2, 3, 4, 5, 6, 7, 8, 8.5, 9, 10, 11, 12.

**Step 3: Verify**

Read `skills/release/phases/1-execute.md` and confirm:
- Step 8.5 exists between step 8 (Phase Retro) and step 9 (Commit)
- HITL-GATE annotation present with gate-check import
- Auto mode documented

---

### Task 2: Remove L0 from retro bubble

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/retro.md:67-84`

**Step 1: Replace section 6 to remove L0 update**

Replace the entire section 6 (lines 67-84) with:

```markdown
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

Read `skills/_shared/retro.md` and confirm:
- Section 6 no longer references "Update L0 summary"
- No "Skip if changes are minor" escape hatch remains
- Explanatory note about /release ownership is present
- L1 update and prune steps preserved
