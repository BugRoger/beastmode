# Differentiator Docs Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Create dedicated argument docs for beastmode's retro loop and configurable gates differentiators, with README integration.

**Architecture:** Two new markdown files in `docs/`, one README edit. Each doc is an independent argumentative essay tuned to its topic. No code, no tests — pure prose.

**Tech Stack:** Markdown

**Design Doc:** `.beastmode/state/design/2026-03-06-differentiator-docs.md`

---

### Task 0: Create Retro Loop Doc

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `docs/retro-loop.md`

**Step 1: Write the retro loop argument doc**

Create `docs/retro-loop.md` with the following content:

```markdown
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
```

**Step 2: Verify**

Read `docs/retro-loop.md` and confirm:
- All 5 sections present (opening, problem, loop mechanics, compounding, payoff)
- Tone matches progressive-hierarchy.md (argumentative, not reference)
- Stands alone without needing other docs

---

### Task 1: Create Configurable Gates Doc

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `docs/configurable-gates.md`

**Step 1: Write the configurable gates argument doc**

Create `docs/configurable-gates.md` with the following content:

```markdown
# Progressive Autonomy Through Configurable Gates

Most AI coding tools offer two speeds: do everything yourself, or let the
AI run unsupervised. You either review every line or trust the machine
completely.

Neither works. Full supervision kills the productivity gain. Full autonomy
produces surprises you find in production.

## The Problem: Binary Trust

The trust question in AI-assisted development isn't "should I trust the AI?"
It's "which decisions should I trust the AI with, and which do I want to see?"

But most tools don't let you answer that question with any granularity. You
get a single toggle: autonomous mode on or off. The AI either asks about
everything or asks about nothing.

This creates a predictable pattern. You start with full supervision because
you don't trust the AI yet. Every session, you approve obvious decisions —
yes, use the existing test framework; yes, follow the project's naming
convention; yes, the implementation matches the plan. After a few sessions,
the approval fatigue sets in. You flip to autonomous mode. A week later,
the AI makes a decision you disagree with — renames a public API, chooses
a different state management approach, skips a validation step. You flip
back to supervised mode. Repeat.

The problem isn't trust. It's that trust is treated as a single dimension
when it's actually dozens of independent decisions.

## The Trust Gradient

Beastmode decomposes the workflow into discrete decision points and makes
each one independently configurable. These decision points are called gates.

Gates sit at specific positions in the five-phase workflow:

```
 DESIGN        PLAN         IMPLEMENT      VALIDATE      RELEASE
 ──────        ────         ─────────      ────────      ───────
 |             |            |              |             |
 * gray-area   * plan       * deviation    |             * version
   selection     approval     handling     |               confirm
 |             |            |              |             |
 * gray-area                * blocked      |             * L0 update
   discussion                 task         |               approval
 |                          |              |
 * section                  * validation   |
   review                     failure      |
 |                                         |
 * design                                  |
   approval                                |
 |             |            |              |             |
 └─── auto ────┘─── auto ──┘──── auto ────┘──── auto ──┘
      transition   transition    transition    transition
```

Each `*` is a gate. Each gate has a mode: `human` or `auto`.

- **human** — pause and ask. The user sees the decision, provides input,
  approves or revises.
- **auto** — Claude decides. The same logic runs, but without pausing.
  The decision is logged for auditability.

Gates aren't just approval checkpoints. They fall into three categories:

**Interactive gates** control dialogue flow. The design phase's gray-area
discussion gate determines whether Claude asks clarifying questions or
makes reasonable assumptions. On `human`, you get a collaborative design
session. On `auto`, you get a design proposal.

**Approval gates** control quality checkpoints. The plan-approval gate
determines whether you review the plan before implementation starts. On
`human`, you see the plan and can revise. On `auto`, Claude self-approves
and moves to implementation.

**Conditional gates** control exception handling. The architectural-deviation
gate fires when implementation hits something the plan didn't anticipate. On
`human`, you decide how to proceed. On `auto`, Claude applies deviation rules
and continues.

## Tuning the Dial

All gate configuration lives in a single file: `.beastmode/config.yaml`.

A fresh project starts fully supervised:

```yaml
gates:
  design:
    gray-area-selection: human
    gray-area-discussion: human
    section-review: human
    design-approval: human
  plan:
    plan-approval: human
  implement:
    architectural-deviation: human
    blocked-task-decision: human
    validation-failure: human
```

After a few sessions, you've seen Claude make solid design decisions. You've
seen plans that match your expectations without revision. You start flipping
gates:

```yaml
gates:
  design:
    gray-area-selection: human     # still want to choose what to discuss
    gray-area-discussion: human    # still want the dialogue
    section-review: auto           # trusting section-level output now
    design-approval: human         # still approving final designs
  plan:
    plan-approval: auto            # plans have been consistently good
  implement:
    architectural-deviation: auto  # claude handles deviations well
    blocked-task-decision: auto    # unblock without asking
    validation-failure: auto       # fix loops are reliable
```

Each gate flip is a statement about where your trust has been earned. Design
dialogue stays supervised because you value the collaboration. Plan approval
goes autonomous because the plans have been consistently good. Implementation
exception handling goes autonomous because Claude's deviation rules work.

Phase transitions have their own gates:

```yaml
transitions:
  design-to-plan: auto          # chain phases without pausing
  plan-to-implement: auto
  implement-to-validate: auto
  validate-to-release: auto
```

When transitions are `auto`, phases chain together in a single session — design
flows into plan flows into implementation without stopping. When `human`, each
phase ends with "next step: run this command" and waits for you to start the
next session.

## Why This Matters

**Trust builds incrementally.** You don't have to decide upfront whether to
trust the AI. You start supervised, observe behavior, and grant autonomy where
it's been earned. Each gate flip is backed by experience, not hope.

**Different phases earn trust at different rates.** Implementation might become
autonomous long before design does — because you've seen the plans execute
cleanly but still want the design dialogue. Binary trust can't express this.
Per-gate configuration can.

**The workflow doesn't change.** The same phases run in the same order with the
same sub-steps. Flipping a gate from `human` to `auto` doesn't skip the
decision — it delegates it. The logic still runs. The result is still logged.
The only difference is whether you see a prompt.

**Autonomy is reversible.** Flip a gate back to `human` at any time. No
workflow changes, no reconfiguration. Just a YAML value. If the AI makes a
decision you disagree with, tighten that specific gate without affecting the
rest of the workflow.

**Scales from solo to team.** A solo developer might run fully autonomous
after a few weeks. A team might keep design approval on `human` indefinitely
because design decisions affect multiple people. The same tool, different
trust profiles. Configuration, not configuration-or-nothing.
```

**Step 2: Verify**

Read `docs/configurable-gates.md` and confirm:
- All 5 sections present (opening, problem, trust gradient + ASCII art, tuning the dial, payoff)
- ASCII art renders correctly in monospace
- Tone matches progressive-hierarchy.md (argumentative, not reference)
- Stands alone without needing other docs

---

### Task 2: Add README Links

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `README.md:87-110`

**Step 1: Add "Read the full argument" link after retro section**

After line 87 (`<img src="docs/assets/retro-bubble-up.svg" alt="Retro Bubble-Up" width="100%">`), add:

```markdown

[Read the full argument.](docs/retro-loop.md)
```

**Step 2: Add "Read the full argument" link after gates section**

After the gates YAML code block closing (line 108: ` ``` `), before line 110 (`Same workflow, different trust level.`), add:

```markdown

[Read the full argument.](docs/configurable-gates.md)

```

**Step 3: Verify**

Read README.md and confirm:
- All 3 differentiator sections in "What's Different" have "Read the full argument" links
- Links point to correct file paths
- Pattern is consistent: summary → diagram/code → link
