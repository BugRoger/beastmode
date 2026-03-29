# Design: Differentiator Docs

## Goal

Create dedicated argument docs for beastmode's 3 main differentiators, with README integration. Each doc makes an independent case for why that differentiator matters.

## Approach

Topic-tuned docs — each doc's internal structure fits its subject rather than mirroring a single template. Two new files, one README update.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Differentiator count | 3 | Hierarchy (exists), retro loop (new), configurable gates (new). Design-before-code stays as workflow property, not standalone doc. |
| Tone | Full argumentative | Problem, insight, mechanism, payoff. Same energy as progressive-hierarchy.md. |
| Structure approach | Topic-tuned | Each doc earns its own structure. Retro follows the loop; gates follow the trust gradient. |
| README integration | Add "Read the full argument" links | Consistent pattern — all 3 differentiators get the same treatment in "What's Different". |
| Gates visualization | ASCII art | No excalidraw. Inline ASCII showing gate positions across phases. |
| File names | `docs/retro-loop.md`, `docs/configurable-gates.md` | Kebab-case, matches existing `docs/progressive-hierarchy.md`. |

### Claude's Discretion

- Exact prose, examples, and wording within each doc
- ASCII art layout for gates
- Specific "compounding" examples in retro doc

## Component Breakdown

### 1. `docs/retro-loop.md`

Structure tuned to the feedback loop narrative:

1. **Opening** (2-3 lines) — Most AI tools have amnesia. Every session is groundhog day.
2. **The Problem: Learning That Doesn't Stick** — Tools generate insights but don't retain them. Same mistake, next Tuesday.
3. **How the Loop Works** — Classification (SOPs, overrides, learnings), promotion rules (3 occurrences -> SOP), bubble-up path from L3 state through L2 detail to L1 summaries.
4. **What Compounds** — Concrete examples: naming convention discovered in session 2 becomes SOP by session 5, informs brownfield discovery in session 10.
5. **Why This Matters** — Each cycle sharpens Claude's understanding of *your* codebase. Not codebases in general.

### 2. `docs/configurable-gates.md`

Structure tuned to the trust gradient narrative:

1. **Opening** (2-3 lines) — Most AI tools offer two speeds: hand-holding or YOLO.
2. **The Problem: Binary Trust** — Either you review everything or review nothing. No middle ground.
3. **The Trust Gradient** — Walk through gate types and positions. ASCII art showing gates across the five phases.
4. **Tuning the Dial** — config.yaml walkthrough. Concrete before/after: what changes when you flip a gate from human to auto.
5. **Why This Matters** — Same workflow scales from day-1 supervision to week-10 autonomy. Trust is granular, not global.

### 3. README.md changes

- After retro section in "What's Different": add `[Read the full argument.](docs/retro-loop.md)`
- After gates section in "What's Different": add `[Read the full argument.](docs/configurable-gates.md)`

## Files Affected

| File | Action |
|------|--------|
| `docs/retro-loop.md` | Create |
| `docs/configurable-gates.md` | Create |
| `README.md` | Edit (add 2 links) |

## Acceptance Criteria

- [ ] `docs/retro-loop.md` exists with sections: opening, problem, loop mechanics, compounding, payoff
- [ ] `docs/configurable-gates.md` exists with sections: opening, problem, trust gradient + ASCII art, tuning the dial, payoff
- [ ] README "What's Different" section links to all 3 docs with "Read the full argument" pattern
- [ ] All three docs are independently readable without needing the others
- [ ] Tone is consistent with existing progressive-hierarchy.md (argumentative, not reference)

## Testing Strategy

Manual review — these are prose docs, not code. Verify:
- Links in README resolve correctly
- ASCII art renders in GitHub markdown preview
- Each doc stands alone

## Deferred Ideas

- Excalidraw diagram for gates (could add later if the ASCII art feels insufficient)
- Design-before-code as a standalone doc (currently covered in "How It Works")
