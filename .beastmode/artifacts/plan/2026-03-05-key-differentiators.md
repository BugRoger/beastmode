# Key Differentiators Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Document beastmode's key differentiators with progressive disclosure — docs/ essay, README bullets, PRODUCT.md agent context.

**Architecture:** New `docs/` folder with standalone essay on progressive hierarchy. README "Why This Works" reworked to lead with hierarchy differentiator + link. PRODUCT.md gains agent-facing "Key Differentiators" section. structure.md updated to document docs/ folder.

**Tech Stack:** Plain markdown, no dependencies.

**Design Doc:** `.beastmode/state/design/2026-03-05-key-differentiators.md`

---

### Task 0: Create `docs/progressive-hierarchy.md`

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `docs/progressive-hierarchy.md`

**Step 1: Create docs/ directory and write the essay**

Write `docs/progressive-hierarchy.md` with the full argument (~800-1200 words):

```markdown
# Progressive Knowledge Hierarchy

Most AI coding tools lose context between sessions. The ones that try to fix this
reach for the same solution: embed everything, retrieve what seems relevant.

That works — until it doesn't.

## The Problem: Flat Context Breaks at Scale

Embedding-based retrieval treats project knowledge as a flat collection of chunks.
Every file, every function, every comment gets embedded into the same vector space.
When the agent needs context, it searches that space and pulls back the top-N results.

For small projects, this is fine. Precision stays high because the search space is small.

But as a codebase grows — more files, more conventions, more architectural decisions,
more history — embedding precision collapses. The agent asks for "how authentication
works" and gets fragments of auth middleware, test fixtures, migration scripts, and
a README section about OAuth. Some of it is relevant. Most of it is noise. The agent
spends tokens sorting through retrieval results instead of doing the work.

This is a fundamental property of flat retrieval, not a tuning problem. Precision
degrades as corpus scale increases. More content means more candidates competing
for the same top-N slots.

## The Insight: Hierarchical Navigation Beats Flat Search

Books have chapters. APIs have namespaces. Codebases have directories. Humans
organize knowledge into hierarchies because hierarchies let you ignore most of the
information most of the time.

The same principle applies to AI agents. Instead of searching a flat space, give the
agent a pre-filtered navigation path. Start with a high-level summary. If the agent
needs more detail, follow a link down one level. Each level is a curated summary of
the level below — written by a human or by a previous agent run, not retrieved by
an embedding model.

This is deterministic, not probabilistic. The agent doesn't hope the right chunk
floats to the top of a similarity search. It navigates a known structure.

## How Beastmode Does It

Beastmode organizes project knowledge into four levels:

**L0 — Product** (`PRODUCT.md`)
The richest standalone summary. Describes what the project is, what it does, and
how it works. Enough for any agent starting cold with zero context. Always loaded.

**L1 — Domain Summaries** (e.g., `context/DESIGN.md`, `meta/PLAN.md`)
One file per phase per domain. Each contains a summary paragraph plus 2-3 sentence
descriptions of each topic below it. Always loaded via `CLAUDE.md` imports. An agent
reading L1 files knows where everything is without loading everything.

**L2 — Detail Files** (e.g., `context/design/architecture.md`)
Full topic detail. Architecture decisions, code conventions, test strategies.
Loaded on demand via `@import` references in L1 files. Only loaded when the agent's
current task touches that domain.

**L3 — State Artifacts** (e.g., `state/design/2026-03-05-feature.md`)
Raw design documents, implementation plans, validation records. Referenced from L2
"Related Decisions" sections. Rarely loaded in full — agents find them through L2
links when they need provenance.

### The Fractal Pattern

Every level follows the same structure: **summary + section summaries + @imports to
the next level down.** This pattern repeats at every level, which is why we call it
fractal. An agent at any level can decide whether to go deeper or stay at the current
summary.

### Curated, Not Retrieved

Each summary is written — either by the user, by the agent during a retro phase, or
during brownfield discovery. These aren't auto-generated embeddings. They're
human-quality descriptions that compress the essential information from the level below.

When the retro sub-phase runs at the end of each workflow phase, it reviews L2 files
for accuracy, updates L1 summaries to match, and propagates changes upward. The
hierarchy stays accurate because maintenance is built into the workflow, not bolted on.

## Why This Matters

**Token efficiency.** Agents load L0 + L1 by default (~2-4k tokens of curated
context). L2 and L3 are loaded only when needed. A flat system would load 10-50x more
tokens for the same effective context.

**Precision.** A curated summary written during the last retro is more relevant than
the top-5 embedding matches for "how does auth work." Summaries capture intent and
relationships. Embeddings capture surface similarity.

**Compounding knowledge.** Every phase retro updates summaries. Over weeks and months,
the hierarchy becomes a progressively richer, more accurate representation of the
project. The agent gets smarter about *your* codebase because the hierarchy improves
with every cycle.

**Session survival.** The hierarchy lives in `.beastmode/` and is version-controlled
in git. There's no vector database to maintain, no embeddings to regenerate when code
changes. The context survives sessions, branches, and collaborators because it's just
markdown files in your repo.
```

**Step 2: Verify**

Check the file exists and reads cleanly:
```bash
wc -l docs/progressive-hierarchy.md
# Expected: ~90-110 lines
```

---

### Task 1: Edit README.md "Why This Works" section

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `README.md:74-82`

**Step 1: Replace the "Why This Works" section**

Replace lines 74-82 (the current "Why This Works" section) with:

```markdown
## Why This Works

**Structured context, not flat retrieval.** Most AI coding tools treat your codebase as a bag of embeddings. Beastmode organizes project knowledge into a [hierarchy](docs/progressive-hierarchy.md) — agents navigate curated summaries before diving into detail.

**Context survives sessions.** Every phase writes artifacts to `.beastmode/`. Next session, Claude starts with full project knowledge. No repeated explanations.

**Knowledge compounds.** Phase retros capture what worked, what didn't, and feed it back into project context. Claude gets smarter about *your* codebase over time.

**Scales to complexity.** Trivial change? Skip to implement. Complex feature? Run every phase.

**No ceremony.** No sprint planning. No story points. No standups. Just you, Claude, and the work.
```

**Step 2: Verify**

Check README line count stays reasonable:
```bash
wc -l README.md
# Expected: ~95-100 lines (was 93, gained ~3 lines)
```

---

### Task 2: Edit PRODUCT.md — Add "Key Differentiators" section

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/PRODUCT.md:30-33`

**Step 1: Add "Key Differentiators" section after "How It Works"**

Append after the last line of PRODUCT.md:

```markdown

## Key Differentiators

- **Progressive knowledge hierarchy**: L0/L1/L2/L3 levels provide curated context at increasing depth. Agents navigate summaries before loading detail. This is deterministic (structured summaries) not probabilistic (embedding retrieval). See `docs/progressive-hierarchy.md` for the full argument.
- **Self-improving retro loop**: Phase checkpoints capture learnings that improve future sessions. Retro agents review context docs for accuracy and propagate updates through the hierarchy.
- **Structured workflow**: Five-phase design-before-code prevents wasted implementation. Each phase produces artifacts consumed by the next.
- **Context persistence**: `.beastmode/` artifacts survive sessions via git. No vector database, no embeddings to regenerate. Just markdown files in your repo.
```

**Step 2: Verify**

```bash
grep -c "Key Differentiators" .beastmode/PRODUCT.md
# Expected: 1 (the heading)
```

---

### Task 3: Update structure.md — Add docs/ to directory layout

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/plan/structure.md:9`
- Modify: `.beastmode/context/plan/structure.md:50-60`

**Step 1: Add docs/ to directory layout**

In the directory tree, after the `.beastmode/` section and before `├── skills/`, add:

```
├── docs/                    # External-facing deep-dive documentation
│   └── progressive-hierarchy.md  # Why hierarchical context beats flat retrieval
```

**Step 2: Add docs/ to Key Directories section**

After the `skills/` key directory entry, add:

```markdown
**`docs/`** — External-Facing Documentation
- Purpose: Deep-dive essays on design philosophy and differentiators
- Contains: Standalone markdown essays linked from README
- Not imported by agents (same rule as ROADMAP.md) — agents reference via PRODUCT.md
```

**Step 3: Verify**

```bash
grep -c "docs/" .beastmode/context/plan/structure.md
# Expected: 3+
```
