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
 * intent      * plan       * deviation    |             * version
   discussion    approval     handling     |               confirm
 |             |            |              |             |
 * approach                 * blocked      |             * L0 update
   selection                  task         |               approval
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

**Interactive gates** control dialogue flow. The design phase's intent-discussion
gate determines whether Claude asks clarifying questions one at a time or
derives intent silently from arguments and codebase. On `human`, you get a
conversational design session. On `auto`, you get a design proposal.

**Approval gates** control quality checkpoints. The plan-approval gate
determines whether you review the plan before implementation starts. On
`human`, you see the plan and can revise. On `auto`, Claude self-approves
and moves to implementation.

**Conditional gates** control exception handling. The architectural-deviation
gate fires when implementation hits something the plan didn't anticipate. On
`human`, you decide how to proceed. On `auto`, Claude applies deviation rules
and continues.

The diagram above shows phase gates. The retro sub-phase and release phase have
additional gates: `retro.context-write`, `retro.records`, `retro.promotions`,
`release.version-confirmation`, and `release.beastmode-md-approval`. See
`.beastmode/config.yaml` for the full gate inventory.

## Tuning the Dial

All gate configuration lives in a single file: `.beastmode/config.yaml`.

A fresh project starts fully supervised:

```yaml
gates:
  design:
    intent-discussion: human
    approach-selection: human
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
    intent-discussion: human       # still want the conversational flow
    approach-selection: human      # still want to pick the approach
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
