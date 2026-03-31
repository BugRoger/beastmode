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

**L0 — System Manual** (`BEASTMODE.md`)
The sole autoloaded file (~40 lines). Contains hierarchy spec, persona definition,
writing rules, and conventions. Enough for any agent to orient after compression.
Always loaded via CLAUDE.md.

**L1 — Domain Summaries** (e.g., `context/DESIGN.md`)
One file per phase. Five L1 files total. Each contains a summary paragraph plus 2-3 sentence
descriptions of each topic below it. Loaded during the prime sub-phase of each
workflow phase (not autoloaded). An agent reading L1 files knows where everything
is without loading everything.

**L2 — Detail Files** (e.g., `context/design/architecture.md`)
Full topic detail. Architecture decisions, code conventions, test strategies.
Loaded on demand via convention-based paths. Only loaded when the agent's
current task touches that domain.

**L3 — State Artifacts** (e.g., `state/design/2026-03-05-feature.md`)
Raw design documents, implementation plans, validation records. Referenced from L2
"Related Decisions" sections. Rarely loaded in full — agents find them through L2
links when they need provenance.

### Two Domains

Beastmode separates knowledge by purpose into two domains, each with its own
directory tree under `.beastmode/`:

| Domain | Path | Purpose | Example |
|--------|------|---------|---------|
| **Context** | `context/` | Published knowledge. What the project knows and how it works. | `context/design/architecture.md` |
| **State** | `state/` | Checkpoint artifacts. What happened when. | `state/design/2026-03-06-feature.md` |

Context spans L1 and L2. State lives at L3 only. Universal process rules live in
BEASTMODE.md (L0). Every phase has its own subdirectory in the context domain.

### The Fractal Pattern

Every level follows the same structure: **summary + section summaries + convention
paths to the next level down.** This pattern repeats at every level, which is why we call it
fractal. An agent at any level can decide whether to go deeper or stay at the current
summary.

### Curated, Not Retrieved

Each summary is written — either by the user, by the agent during a retro phase, or
during brownfield discovery. These aren't auto-generated embeddings. They're
human-quality descriptions that compress the essential information from the level below.

When the retro sub-phase runs at the end of each workflow phase, it reviews L2 files
for accuracy, updates L1 summaries to match, and propagates changes upward. The
hierarchy stays accurate because maintenance is built into the workflow, not bolted on.

### Write Protection

Knowledge flows upward through a strict promotion path. Phases write artifacts to
`state/` only — never directly to `context/`. The retro sub-phase, which
runs at release, is the sole gatekeeper for upward promotion:

| Writer | Allowed Targets | Mechanism |
|--------|----------------|-----------|
| Phase checkpoints | `state/` | Direct write |
| Retro | L1, L2 | Bottom-up promotion |
| Release | L0 | Release-time L1->L0 rollup |
| Init | L0, L1, L2 | Bootstrap exemption |

This prevents phases from corrupting published knowledge. A design phase can't
accidentally overwrite an architecture decision in `context/design/architecture.md`
— it writes its design doc to `state/design/`, and retro decides what gets promoted.

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
whether context changes require human approval or auto-apply.
Gates are defined in `.beastmode/config.yaml`.

## Why This Matters

**Token efficiency.** Agents load L0 by default (~40 lines). L1 loaded during
prime. L2 and L3 loaded on demand. A flat system would load 10-50x more tokens for
the same effective context.

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
