# Design: Key Differentiators Documentation

## Goal

Document beastmode's key differentiators with progressive disclosure — README bullets hook readers, `docs/` essays convince them, PRODUCT.md informs agents. Start with progressive knowledge hierarchy as the deep-dive, stub remaining differentiators.

## Approach

Create a `docs/` folder. Expand README's "Why This Works" with a sharper hierarchy bullet that links out. Write a full essay on progressive hierarchy covering the embedding collapse problem and how beastmode solves it. Add agent-facing context to PRODUCT.md.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary location | `docs/` folder at repo root | Scalable for future differentiators, keeps README clean |
| README treatment | Expand "Why This Works" bullets, link to docs/ | Tease the argument, don't essay it inline |
| First deep-dive | `docs/progressive-hierarchy.md` | #1 differentiator, backed by technical argument |
| Agent context | PRODUCT.md gains "Key Differentiators" section | Agents should understand *why* the hierarchy exists |
| Essay structure | Problem → Insight → How → Why it matters | Plain markdown, narrative arc |
| Other differentiators | Stub sections for later | Retro loop, structured workflow, context persistence |
| docs/ not imported by agents | Same rule as ROADMAP.md | External-facing, not agent context |

### Claude's Discretion

- Exact metaphors and wording in the essay
- How much of the embedding collapse argument to include (conceptual vs curves)
- Whether docs/ gets an index file or just individual essays
- README bullet ordering within "Why This Works"

## Components

### 1. New: `docs/progressive-hierarchy.md`

Full essay (~800-1200 words). Structure:

**The Problem: Flat Context Doesn't Scale**
- Most agentic tools either dump everything into the prompt or use embedding retrieval
- Embedding precision collapses as codebase grows
- Result: agents get noisy, irrelevant context and waste tokens navigating it

**The Insight: Hierarchical Beats Flat**
- Pre-filtered navigation through curated summaries (deterministic, not probabilistic)
- Same principle that makes books have chapters, APIs have namespaces, codebases have directories
- At each level, context is *curated* — a human-quality summary, not a retrieval result

**How Beastmode Does It: L0/L1/L2/L3**
- L0 (PRODUCT.md): Project vision — enough for any agent starting cold
- L1 (domain summaries): Always loaded — phase-specific context, meta learnings, feature state
- L2 (detail files): Loaded on demand via @imports — architecture, conventions, testing
- L3 (state artifacts): Raw design docs, plans, validation records — referenced, rarely loaded
- The fractal pattern: every level is summary + section summaries + @imports to next level

**Why It Matters for AI Agents**
- Token efficiency: agents only load what they need
- Precision: curated summaries > embedding matches
- Compounding: retro phases update summaries, so context improves over time
- Session survival: hierarchy lives in git, not in memory

### 2. Edit: `README.md` — Expand "Why This Works"

Rework to lead with the hierarchy differentiator:

```markdown
## Why This Works

**Structured context, not flat retrieval.** Most AI coding tools treat your codebase as a bag of
embeddings. Beastmode organizes project knowledge into a hierarchy — agents navigate summaries
before diving into detail. [Read the full argument →](docs/progressive-hierarchy.md)

**Context survives sessions.** Every phase writes artifacts to `.beastmode/`. Next session,
Claude starts with full project knowledge. No repeated explanations.

**Knowledge compounds.** Phase retros capture what worked, what didn't, and feed it back into
project context. Claude gets smarter about *your* codebase over time.

**Scales to complexity.** Trivial change? Skip to implement. Complex feature? Run every phase.

**No ceremony.** No sprint planning. No story points. No standups. Just you, Claude, and the work.
```

### 3. Edit: `.beastmode/PRODUCT.md` — Agent-facing context

Add a "Key Differentiators" section:

- **Progressive knowledge hierarchy**: L0/L1/L2/L3 levels provide curated context at increasing depth. Agents navigate summaries before loading detail. This is deterministic (structured summaries) not probabilistic (embedding retrieval).
- **Self-improving retro loop** (stub): Phase checkpoints capture learnings that improve future sessions.
- **Structured workflow** (stub): Five-phase design-before-code prevents wasted implementation.
- **Context persistence** (stub): `.beastmode/` artifacts survive sessions via git.

### 4. Future: Additional docs/ essays

Stubs for later designs:
- `docs/retro-learning-loop.md` — How phase retros compound knowledge
- `docs/structured-workflow.md` — Why design-before-code matters for AI
- `docs/context-persistence.md` — Git-native context across sessions

## Files Affected

| File | Change |
|------|--------|
| `docs/progressive-hierarchy.md` | **New** — full essay on progressive hierarchy |
| `README.md` | **Edit** — expand "Why This Works" with hierarchy lead bullet + link |
| `.beastmode/PRODUCT.md` | **Edit** — add "Key Differentiators" section for agents |

## Acceptance Criteria

- [ ] `docs/progressive-hierarchy.md` exists with problem → insight → how → why structure
- [ ] Essay covers embedding collapse argument at conceptual level
- [ ] Essay explains L0/L1/L2/L3 with concrete examples
- [ ] README "Why This Works" leads with hierarchy differentiator and links to docs/
- [ ] README stays under 120 lines
- [ ] PRODUCT.md has agent-facing differentiators section
- [ ] docs/ is NOT imported in CLAUDE.md or .beastmode/CLAUDE.md
- [ ] Active voice throughout (Strunk rule 10)
- [ ] Retro loop, structured workflow, context persistence appear as stubs

## Testing Strategy

- Read docs/progressive-hierarchy.md standalone — does the argument make sense without README context?
- Read README "Why This Works" — does the hierarchy bullet hook without requiring the docs link?
- Check PRODUCT.md in agent session — does it inform without overwhelming?
- Verify no broken links between README → docs/

## Deferred Ideas

- Diagrams/visuals for the hierarchy (SVG showing L0→L1→L2→L3 navigation)
- Comparison table vs flat-context tools (after more differentiators are fleshed out)
- Full essays for retro loop, structured workflow, context persistence
