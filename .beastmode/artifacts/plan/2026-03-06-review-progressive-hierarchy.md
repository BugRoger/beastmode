# Review Progressive Hierarchy Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Update `docs/progressive-hierarchy.md` to be a complete spec reflecting the current hierarchy implementation.

**Architecture:** Single-file additive edit. Four changes: inline fixes to level descriptions, two new subsections under "How Beastmode Does It", one new section before "Why This Matters". Preserves existing narrative flow.

**Tech Stack:** Markdown

**Design Doc:** `.beastmode/state/design/2026-03-06-review-progressive-hierarchy.md`

---

### Task 0: Fix Level Descriptions

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `docs/progressive-hierarchy.md:45-63`

**Step 1: Update L0 line count**

Replace line 46:
```markdown
The sole autoloaded file (~120 lines). Contains hierarchy spec, persona definition,
```
With:
```markdown
The sole autoloaded file (~80 lines). Contains hierarchy spec, persona definition,
```

**Step 2: Update L1 description to show dual-domain pattern**

Replace lines 50-53:
```markdown
**L1 — Domain Summaries** (e.g., `context/DESIGN.md`, `meta/PLAN.md`)
One file per phase per domain. Each contains a summary paragraph plus 2-3 sentence
descriptions of each topic below it. Loaded by skill primes (not autoloaded). An
agent reading L1 files knows where everything is without loading everything.
```
With:
```markdown
**L1 — Domain Summaries** (e.g., `context/DESIGN.md`, `meta/DESIGN.md`)
One file per phase per domain — both context and meta. Ten L1 files total (five
phases times two domains). Each contains a summary paragraph plus 2-3 sentence
descriptions of each topic below it. Loaded during the prime sub-phase of each
workflow phase (not autoloaded). An agent reading L1 files knows where everything
is without loading everything.
```

**Step 3: Verify**

Read the file and confirm lines 45-65 look correct.

---

### Task 1: Add Three Domains Subsection

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `docs/progressive-hierarchy.md:63-65`

**Step 1: Insert Three Domains subsection**

After the L3 description (after line 63) and before "### The Fractal Pattern" (line 65), insert:

```markdown

### Three Domains

Beastmode separates knowledge by purpose into three domains, each with its own
directory tree under `.beastmode/`:

| Domain | Path | Purpose | Example |
|--------|------|---------|---------|
| **Context** | `context/` | Published knowledge. What the project knows. | `context/design/architecture.md` |
| **Meta** | `meta/` | Learnings, SOPs, overrides. How the project works. | `meta/design/learnings.md` |
| **State** | `state/` | Checkpoint artifacts. What happened when. | `state/design/2026-03-06-feature.md` |

Context and Meta both span L1 and L2. State lives at L3 only. Every phase has its
own subdirectory in each domain.

```

**Step 2: Verify**

Read the file and confirm the Three Domains subsection appears between L3 and The Fractal Pattern.

---

### Task 2: Add Write Protection Subsection

**Wave:** 3
**Depends on:** Task 1

**Files:**
- Modify: `docs/progressive-hierarchy.md` (after "Curated, Not Retrieved" section)

**Step 1: Insert Write Protection subsection**

After the "Curated, Not Retrieved" section (after the paragraph ending "...not bolted on."), insert:

```markdown

### Write Protection

Knowledge flows upward through a strict promotion path. Phases write artifacts to
`state/` only — never directly to `context/` or `meta/`. The retro sub-phase, which
runs at the end of every phase, is the sole gatekeeper for upward promotion:

| Writer | Allowed Targets | Mechanism |
|--------|----------------|-----------|
| Phase checkpoints | `state/` | Direct write |
| Retro | L1, L2 | Bottom-up promotion |
| Release | L0 | Release-time L1->L0 rollup |
| Init | L0, L1, L2 | Bootstrap exemption |

This prevents phases from corrupting published knowledge. A design phase can't
accidentally overwrite an architecture decision in `context/design/architecture.md`
— it writes its design doc to `state/design/`, and retro decides what gets promoted.

```

**Step 2: Verify**

Read the file and confirm Write Protection appears after Curated, Not Retrieved.

---

### Task 3: Add Workflow Section

**Wave:** 4
**Depends on:** Task 2

**Files:**
- Modify: `docs/progressive-hierarchy.md` (before "## Why This Matters")

**Step 1: Insert The Workflow That Drives It section**

Before the "## Why This Matters" heading, insert:

```markdown
## The Workflow That Drives It

The hierarchy doesn't maintain itself. It stays accurate because maintenance is
structural — built into a five-phase workflow that every feature passes through:

**design** -> **plan** -> **implement** -> **validate** -> **release**

Each phase follows the same four sub-phases: **prime** (load context) -> **execute**
(do the work) -> **validate** (check quality) -> **checkpoint** (save artifacts,
run retro).

The retro sub-phase runs inside every checkpoint. It compares the phase's output
against existing L1 and L2 files, proposes updates, and promotes changes upward
through the hierarchy. This is how the hierarchy compounds — every phase cycle is an
opportunity to refine what the project knows about itself.

Retro is also gated: a configurable HITL (human-in-the-loop) gate system controls
whether context writes, learnings, SOPs, and overrides require human approval or
auto-apply. Gates are defined in `.beastmode/config.yaml`.

```

**Step 2: Update "Why This Matters" token reference**

In the "Why This Matters" section, update the L0 line reference:
```markdown
**Token efficiency.** Agents load L0 by default (~120 lines). L1 loaded during
```
To:
```markdown
**Token efficiency.** Agents load L0 by default (~80 lines). L1 loaded during
```

**Step 3: Verify**

Read the full file and confirm:
- The Workflow section appears between How Beastmode Does It content and Why This Matters
- L0 line count is ~80 in both locations
- All four new/updated sections are present
