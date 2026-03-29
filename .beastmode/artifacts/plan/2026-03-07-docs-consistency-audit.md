# Documentation Consistency Audit — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Fix stale terminology, roadmap drift, and gate doc gaps across 5 documentation files to match v0.14.19.

**Architecture:** Pure documentation edits — no code, no new files. Each task modifies one file with surgical find-and-replace edits.

**Tech Stack:** Markdown

**Design Doc:** `.beastmode/state/design/2026-03-07-docs-consistency-audit.md`

---

### Task 1: Abstract retro terminology in retro-loop.md

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `docs/retro-loop.md:39-62`
- Modify: `docs/retro-loop.md:69-84`

**Step 1: Replace the three-category taxonomy**

In `docs/retro-loop.md`, replace the Meta Walker classification section (lines 39-49):

```markdown
**The Meta Walker** extracts operational insights from the session. It classifies
each finding into one of three categories:

- **Learnings** — observations from this session. "The test suite takes 4 minutes
  when run with coverage enabled." Kept as timestamped notes.
- **SOPs** — reusable procedures. "Always run `db:migrate` before `db:seed` in
  this project." Written as actionable instructions that future agents follow.
- **Overrides** — project-specific rules that customize default behavior. "Never
  auto-format `.sql` files — the team uses a custom style." Applied as constraints
  during execution.

Each category has a different shelf life and a different promotion path.
```

With:

```markdown
**The Meta Walker** extracts operational insights from the session. Findings range
from one-off observations ("the test suite takes 4 minutes with coverage enabled")
to reusable procedures ("always run `db:migrate` before `db:seed`") to
project-specific rules ("never auto-format `.sql` files — the team uses a custom
style").

Each finding is recorded with a confidence level that reflects how well-established
the pattern is.
```

**Step 2: Replace the promotion mechanism**

Replace the "Promotion Mechanism" section (lines 53-62):

```markdown
### The Promotion Mechanism

Learnings are provisional. A single observation might be noise. But when the same
learning appears across three separate sessions, it's a pattern — and the meta
walker auto-promotes it to an SOP.

\```
Session 3: "snake_case for DB columns"  — learning
Session 5: "snake_case for DB columns"  — learning (recurring)
Session 7: "snake_case for DB columns"  — promoted to SOP
\```

After promotion, the SOP loads during every future prime phase. The agent doesn't
re-discover the convention. It already knows.
```

With:

```markdown
### The Promotion Mechanism

A single observation might be noise. But when the same finding recurs across
sessions, its confidence rises — and recurring patterns automatically promote
to procedures that load during every future prime phase.

\```
Session 3: "snake_case for DB columns"  — recorded (low confidence)
Session 5: "snake_case for DB columns"  — recurring (medium confidence)
Session 7: "snake_case for DB columns"  — promoted to procedure (high confidence)
\```

After promotion, the agent doesn't re-discover the convention. It already knows.
```

**Step 3: Update the bubble-up path**

Replace lines 72-84 (the four numbered steps in "The Bubble-Up Path"):

```markdown
1. **State artifacts** (L3) capture raw session output — design docs, plans,
   validation records
2. **Detail files** (L2) get updated when findings affect published knowledge —
   architecture, conventions, testing strategies
3. **Domain summaries** (L1) get recomputed to reflect L2 changes — ensuring
   agents loading summaries see accurate overviews
4. **The system manual** (L0) gets updated at release time — rolling up L1
   changes into the always-loaded project context
```

No change needed here — this section uses L0/L1/L2/L3 terminology which is current. Skip.

**Step 4: Update "What Compounds" section**

Replace the Week 3 example (lines 94-96):

```markdown
**Week 3:** The same pattern surfaces in two more sessions. Retro promotes it
to an SOP: "Wrap service calls in `Result<T, AppError>`, never throw."
```

With:

```markdown
**Week 3:** The same pattern surfaces in two more sessions. Retro promotes it
to a procedure: "Wrap service calls in `Result<T, AppError>`, never throw."
```

**Step 5: Update "Why This Matters" section**

Replace "Fewer repeated mistakes" paragraph (lines 113-114):

```markdown
**Fewer repeated mistakes.** The same naming inconsistency doesn't recur across
sessions. The same build step isn't forgotten next Tuesday. Knowledge persists
because the review process is structural, not optional.
```

No change needed — already uses generic language. Skip.

**Step 6: Verify**

Search `docs/retro-loop.md` for "Learnings", "SOPs", "Overrides" as standalone taxonomy terms. Should find zero matches (references within quoted examples are OK if they demonstrate the concept generically).

---

### Task 2: Fix meta domain example in progressive-hierarchy.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `docs/progressive-hierarchy.md:72-76`

**Step 1: Update the Three Domains table**

In `docs/progressive-hierarchy.md`, replace the meta row in the table (line 76):

```markdown
| **Meta** | `meta/` | Learnings, SOPs, overrides. How the project works. | `meta/design/learnings.md` |
```

With:

```markdown
| **Meta** | `meta/` | Process knowledge. How the project works. | `meta/DESIGN.md` |
```

**Step 2: Verify**

Read the Three Domains table and confirm: meta example path is `meta/DESIGN.md`, no reference to `learnings.md`.

---

### Task 3: Add retro+release gate mention to configurable-gates.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `docs/configurable-gates.md:56-63`

**Step 1: Add paragraph after gate diagram**

After the existing paragraph following the diagram (line 63: "- **auto** — Claude decides..."), add a new paragraph:

```markdown

The diagram above shows phase gates. The retro sub-phase and release phase have
additional gates: `retro.context-write`, `retro.records`, `retro.promotions`,
`release.version-confirmation`, and `release.beastmode-md-approval`. See
`.beastmode/config.yaml` for the full gate inventory.
```

**Step 2: Verify**

Search `docs/configurable-gates.md` for "retro.context-write". Should find exactly one match.

---

### Task 4: Fix domain count and retro terms in README.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `README.md:56-59`
- Modify: `README.md:79-85`

**Step 1: Fix domain count and bullet list**

In `README.md`, replace the four-domain section (lines 54-59):

```markdown
Four domains organize what gets persisted:

- **Product** — what you're building (vision, goals)
- **Context** — how to build it (architecture, conventions, testing)
- **State** — where features are in the workflow (design through release)
- **Meta** — what you've learned (SOPs, overrides, session insights)
```

With:

```markdown
Three domains organize what gets persisted:

- **Context** — what the project knows (architecture, conventions, product vision)
- **State** — where features are in the workflow (design through release)
- **Meta** — what you've learned (procedures, process insights, project-specific rules)
```

**Step 2: Abstract retro terminology in "What's Different"**

Replace the retro classification bullets (lines 79-85):

```markdown
Beastmode captures what worked and what failed at every checkpoint. Retro agents classify each finding:

- **SOPs** — reusable procedures that apply across sessions
- **Overrides** — project-specific rules that customize phase behavior
- **Learnings** — session insights, friction points, patterns noticed

Recurring learnings promote to SOPs after three sessions. Each cycle sharpens Claude's understanding of *your* codebase, not codebases in general.
```

With:

```markdown
Beastmode captures what worked and what failed at every checkpoint. Retro agents review each finding and record it with a confidence level. Recurring patterns promote to procedures that load automatically in future sessions. Each cycle sharpens Claude's understanding of *your* codebase, not codebases in general.
```

**Step 3: Verify**

Search `README.md` for "four domains", "Four domains", "SOPs", "Overrides" as taxonomy. Should find zero matches.

---

### Task 5: Fix ROADMAP.md item placement

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `ROADMAP.md:7-36`

**Step 1: Rewrite Now section**

Replace the current Now section (lines 7-16):

```markdown
## Now

Shipped and working in the current release.

- **Five-phase workflow** — design → plan → implement → validate → release
- **Configurable HITL gates** — `.beastmode/config.yaml` with `human`/`auto` modes per gate
- **Context persistence** — `.beastmode/` artifact storage survives across sessions
- **Meta layer** — phase retros capture learnings that inform future sessions
- **Git worktree isolation** — each feature gets its own worktree and branch
- **Brownfield discovery** — `/beastmode init --brownfield` auto-populates context from existing codebases
- **Progressive knowledge hierarchy** — L0/L1/L2/L3 with fractal progressive enhancement
```

With:

```markdown
## Now

Shipped and working in the current release.

- **Five-phase workflow** — design → plan → implement → validate → release
- **Configurable HITL gates** — `.beastmode/config.yaml` with `human`/`auto` modes per gate
- **Context persistence** — `.beastmode/` artifact storage survives across sessions
- **Meta layer** — phase retros capture findings that inform future sessions
- **Git worktree isolation** — each feature gets its own worktree and branch
- **Brownfield discovery** — `/beastmode init --brownfield` auto-populates context from existing codebases
- **Progressive knowledge hierarchy** — L0/L1/L2/L3 with fractal progressive enhancement
- **Phase auto-chaining** — transitions between phases fire automatically via Skill tool calls when context threshold is met, configurable per-transition in `config.yaml`
- **Confidence-gated meta promotion** — L3 records use confidence tags with frequency-based promotion to L1 Procedures
- **Checkpoint restart** — re-run any phase by passing its artifact path (e.g., `/plan .beastmode/state/design/...`)
```

**Step 2: Slim down Next section**

Replace the current Next section (lines 18-23):

```markdown
## Next

Designed or partially built. Coming soon.

- **Progressive Autonomy Stage 2** — auto-chaining between phases. The gate mechanism exists (`config.yaml` transitions with `auto` mode), but the wiring to `/compact` and auto-invoke the next skill is incomplete. When done: trigger `/design`, walk away, come back to a completed feature branch.
- **Checkpoint restart** — restart from the last successful phase instead of re-running everything. Phase artifacts already support this; the explicit restart command doesn't exist yet.
- **Demo recording** — terminal demo GIF/SVG for README.
```

With:

```markdown
## Next

Designed or partially built. Coming soon.

- **Demo recording** — terminal demo GIF/SVG for README.
```

**Step 3: Remove "Retro confidence scoring" from Later**

In the Later section, remove this bullet:

```markdown
- **Retro confidence scoring** — weight learnings by frequency and recency instead of raw count. A learning seen 3 times this week matters more than one seen 3 times over 3 months. Confidence decay for stale patterns, growth for recurring ones. Smarter auto-promotion to SOPs.
```

**Step 4: Verify**

Search `ROADMAP.md` for "/compact". Should find zero matches. Search for "Retro confidence scoring". Should find zero matches. Confirm "Phase auto-chaining" appears in Now section.
