# Design: README Differentiators

## Goal

Make key differentiators prominent in the README. Lead with progressive knowledge hierarchy, give all four differentiators equal weight with substantial inline arguments.

## Approach

Add a new "What Makes It Different" section immediately after "What It Does" with four substantial inline arguments (4-6 lines each). Remove "Why This Works" as redundant — its content is promoted into the new section. Each differentiator uses bold heading + prose + essay link pattern.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Placement | After "What It Does", before "Install" | Readers see the argument before the how-to |
| Inline depth | Substantial — 4-6 lines per differentiator | Hook without requiring click-through |
| Scope | All four differentiators at equal weight | Each is a real differentiator, not padding |
| Visual treatment | Bold heading + prose paragraphs + essay link | Clean, readable, matches existing README style |
| "Why This Works" | Remove — content promoted into new section | Avoids redundancy; differentiators subsume it |

### Claude's Discretion

- Exact wording and metaphors for each differentiator's prose
- Whether non-hierarchy differentiators link to `<!-- TODO -->` stubs or have no link until essays are written
- Exact line counts per differentiator (4-6 line target, may vary)
- Transition text between sections

## Components

### 1. New: "What Makes It Different" section

Four differentiators, each with bold lead sentence + 4-6 lines of prose + essay link:

**Structured context, not flat retrieval.**
- Problem: embedding-based retrieval precision collapses as codebase grows
- Insight: hierarchical navigation through curated summaries beats flat search
- How: L0/L1/L2/L3 levels — agents navigate summaries, load detail on demand
- Links to `docs/progressive-hierarchy.md`

**Knowledge compounds.**
- Problem: AI tools make the same mistakes repeatedly, no memory of what worked
- Insight: structured retro phases capture learnings that inform future sessions
- How: phase checkpoints classify findings, recurring learnings auto-promote to SOPs

**Context survives sessions.**
- Problem: new session = blank slate, re-explain your architecture
- Insight: markdown artifacts in git survive sessions, branches, collaborators
- How: `.beastmode/` folder with four domains, no vector database, no embeddings

**Design before code.**
- Problem: AI jumps to implementation, you get auth systems when you asked for login forms
- Insight: five structured phases prevent wasted implementation
- How: trivial → skip to implement; complex → run every phase; structure scales, not overhead

### 2. Remove: "Why This Works" section

Current content at lines 74-84 of README.md. All five bullets are absorbed into the four differentiators above:
- "Structured context" → differentiator 1
- "Context survives" → differentiator 3
- "Knowledge compounds" → differentiator 2
- "Scales to complexity" → differentiator 4
- "No ceremony" → differentiator 4

### 3. Adjust: README structure

New order:
```
Title + tagline
What It Does
What Makes It Different    ← NEW
Install
Skills
How It Works
Credits
```

## Files Affected

| File | Change |
|------|--------|
| `README.md` | **Edit** — add "What Makes It Different" section, remove "Why This Works" |

## Acceptance Criteria

- [ ] "What Makes It Different" section exists after "What It Does"
- [ ] Progressive hierarchy differentiator inlines the embedding collapse argument with link to `docs/progressive-hierarchy.md`
- [ ] Knowledge compounds differentiator covers retro loop and auto-promotion
- [ ] Context survives differentiator covers `.beastmode/` + git persistence
- [ ] Design before code differentiator covers five phases + scaling
- [ ] Each differentiator has bold lead sentence + 4-6 lines of prose
- [ ] "Why This Works" section removed (content absorbed)
- [ ] Link to `docs/progressive-hierarchy.md` is not broken
- [ ] README stays under 120 lines
- [ ] Active voice throughout

## Testing Strategy

- Read README standalone — does the differentiators section make the case without requiring essay links?
- Verify `docs/progressive-hierarchy.md` link works
- Count lines — must stay under 120
- Check for passive voice

## Deferred Ideas

- Full essays for knowledge compounds, context persistence, design before code (`docs/` folder)
- ~~Demo GIF/SVG for README~~ (implemented: 2026-03-08)
- Comparison table vs flat-context tools
