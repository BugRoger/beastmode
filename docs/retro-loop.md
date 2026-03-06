# Self-Improving Retro Loop

Most AI coding tools treat every session as their first. You fix a naming
inconsistency on Monday. On Tuesday, the same agent makes the same mistake.
The fix taught it nothing.

Agents don't learn from experience because they have no mechanism for it.

## The Problem: Learning That Doesn't Stick

Every AI coding session generates implicit knowledge. The agent discovers that
your project uses `snake_case` for database columns. That `useAuth` returns a
tuple, not an object. That the CI pipeline fails if you import from `src/` instead
of `@/`.

This knowledge exists for the duration of the session. Then the context window
closes, and it's gone. The next session starts from the same blank slate. The
agent re-discovers the same conventions, re-encounters the same edge cases,
re-makes the same mistakes.

Some tools try to fix this with persistent memory — append-only logs of "things
to remember." But logs grow without structure. After a few weeks, the agent loads
hundreds of unranked observations and spends tokens processing noise. What
matters gets buried under what was merely noticed.

The problem isn't memory. It's the absence of a review process.

## How the Loop Works

Beastmode runs a retro sub-phase at the end of every workflow phase. Not just
at the end of the project — at the end of each design, plan, implementation,
validation, and release cycle. Two specialized agents review what happened.

**The Context Walker** checks whether the project's published knowledge is still
accurate. It compares what the agent just did against what the documentation says.
If the architecture doc says "auth uses JWT" but the implementation just switched
to session cookies, the context walker flags the drift and proposes an update.

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

### The Promotion Mechanism

Learnings are provisional. A single observation might be noise. But when the same
learning appears across three separate sessions, it's a pattern — and the meta
walker auto-promotes it to an SOP.

```
Session 3: "snake_case for DB columns"  — learning
Session 5: "snake_case for DB columns"  — learning (recurring)
Session 7: "snake_case for DB columns"  — promoted to SOP
```

After promotion, the SOP loads during every future prime phase. The agent doesn't
re-discover the convention. It already knows.

### The Bubble-Up Path

Findings don't stay where they're written. The retro process propagates changes
upward through the knowledge hierarchy:

1. **State artifacts** (L3) capture raw session output — design docs, plans,
   validation records
2. **Detail files** (L2) get updated when findings affect published knowledge —
   architecture, conventions, testing strategies
3. **Domain summaries** (L1) get recomputed to reflect L2 changes — ensuring
   agents loading summaries see accurate overviews
4. **The system manual** (L0) gets updated at release time — rolling up L1
   changes into the always-loaded project context

Each level is a curated compression of the level below. The retro process keeps
them in sync. When session 7 promotes a naming convention to SOP, it updates
the conventions detail file (L2), recomputes the plan summary (L1), and at the
next release, the system manual (L0) reflects it.

## What Compounds

The retro loop doesn't just prevent repeated mistakes. It builds institutional
knowledge.

**Week 1:** The agent discovers your project's error handling pattern during
implementation. Retro captures it as a learning.

**Week 3:** The same pattern surfaces in two more sessions. Retro promotes it
to an SOP: "Wrap service calls in `Result<T, AppError>`, never throw."

**Week 5:** A new feature requires an API endpoint. During prime, the agent loads
the SOP. It writes the error handling correctly on the first try. No re-discovery.
No correction cycle.

**Week 8:** A new team member runs `/beastmode init --brownfield` on their clone.
The brownfield discovery agent reads the SOPs and conventions. The new contributor's
first AI-assisted session already knows how the team handles errors, names
variables, and structures tests.

Each retro cycle adds a thin layer of understanding. Over weeks and months, those
layers compound into a progressively sharper model of your specific codebase —
not generic best practices, but the actual patterns your team uses.

## Why This Matters

**Fewer repeated mistakes.** The same naming inconsistency doesn't recur across
sessions. The same build step isn't forgotten next Tuesday. Knowledge persists
because the review process is structural, not optional.

**Progressive sharpening.** Each cycle makes the agent slightly better at your
project. Not better at coding in general — better at coding *here*. The
difference between a generic assistant and one that knows your codebase is
accumulated retro cycles.

**Earned trust.** When the agent stops making mistakes you've already corrected,
you trust it with more. The retro loop is the mechanism that makes progressive
autonomy credible — you flip gates to `auto` because the agent has demonstrated
it learned your conventions.

**Team knowledge, not individual memory.** SOPs and conventions live in
`.beastmode/`, version-controlled in git. When a team member leaves, their
accumulated corrections stay. When a new member joins, they inherit the full
knowledge base. The retro loop turns individual sessions into team-wide
institutional knowledge.
