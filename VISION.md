# Beastmode Vision

> Workflow patterns that survived contact with reality.

AI coding tools are powerful but chaotic. They forget everything between sessions, wander off-spec mid-task, and skip straight to code like design review is optional. The result: context amnesia, scope creep, and technical debt that compounds with every prompt.

Beastmode fixes this with structure borrowed from enterprise practices—the parts that actually work—adapted for solo engineers and small teams. Five phases. Configurable gates. Start with full human control, progressively remove training wheels until your agents run features autonomously while you focus on what to build next.

Born from [superpowers](https://github.com/obra/superpowers) and [get-shit-done](https://github.com/gsd-build/get-shit-done). Crystallized into something you can actually ship with.

---

## The Core Insight

```
input → Function → result → Function → result → Function → result
```

Each phase is a function. Takes input, produces output. Outputs become inputs for the next phase. This isn't just clean architecture—it's what makes the whole system composable, chainable, and restartable.

When a phase fails, you don't lose everything. You restart from the last checkpoint. When you want to parallelize, you spawn independent phase executions. When you want to audit, you inspect the artifacts between phases.

Functions all the way down.

---

## The Problem

Three ways AI coding goes sideways:

**Context amnesia.** New session, blank slate. You explain the architecture again. And again. The AI has no memory of yesterday's decisions, last week's refactor, or why you chose that particular pattern. Every conversation starts from zero.

**Scope chaos.** You asked for a login form. You got a login form, a password reset flow, email verification, OAuth integration, and a half-finished admin panel. The AI interpreted "login" as "auth system" and burned 50k tokens before you noticed.

**Process vacuum.** No design phase. No task breakdown. Just straight to code. The AI produces something that works—until you realize it doesn't fit the architecture, violates three conventions, and needs to be rewritten. Design review exists for a reason.

These compound. Context loss means the AI can't remember the design decisions that would prevent scope creep. Scope creep means more context to lose next session. Without process, there's no checkpoint where you can catch any of this before it ships.

---

## Where Beastmode Fits

Software delivery has layers. Enterprise frameworks like SAFe spell them out:

```
Portfolio:   Strategy → Ideate → Review → Analyse → Prioritize → Epic
Program:     Epic → Refine → Partition → Estimate → Approve → Feature
Development: Feature → Design → Plan → Implement → Validate → Story    ← BEASTMODE
Delivery:    Story → Integrate → Test → Deploy → Release → Product
Operations:  Product → Support → Patch → Secure → Optimize → Stability
```

Beastmode focuses **only on Development**. Takes a Feature as input, produces a Story (working code) as output.

We ignore Portfolio (strategy), Program (project management), Delivery (CI/CD), and Operations (monitoring). Different tools, different concerns, different teams. Trying to solve everything solves nothing.

This constraint is deliberate. Beastmode is for the work between "we decided to build X" and "X is ready for integration." The part where an engineer (human or AI) turns a design into code.

---

## Assumptions

Beastmode assumes:

- **Claude Code, Git, GitHub** — The toolchain. Other agentic tools may follow, but Claude Code is primary.
- **Human or agent orchestration** — Both work. You choose based on trust and task complexity.
- **Configurable gates** — Phases allow "Human in the Loop" approval points. Phases can also run without human interaction.
- **Development focus only** — Ignores Portfolio, Product, Delivery, Support. Stay in your lane.
- **GitHub as release target** — Code ships to GitHub repos.
- **Parallel features supported** — Work multiple features simultaneously, each in isolation.
- **Single machine or distributed** — Works locally or across machines.
- **Human can easily follow state** — Feature status is always visible and auditable.

**Two orchestration models:**

```
SUBAGENTS (hierarchical):           AGENT TEAMS (peer-based):

       ┌───┐                        ┌───┐ ┌───┐ ┌───┐
       │ A │                        │ A │ │ B │ │ C │
       └─┬─┘                        └─┬─┘ └─┬─┘ └─┬─┘
    ┌────┼────┐                       │     │     │
  ┌─┴─┐┌─┴─┐┌─┴─┐                     └─────┼─────┘
  │ B ││ C ││ D │                       Shared Tasklist
  └───┘└───┘└───┘
```

**Subagents:** One orchestrator spawns workers. Clear hierarchy. Good when one agent needs to coordinate multiple specialized tasks within a phase.

**Agent Teams:** Peers pull from shared tasklist. No hierarchy. Good when multiple features run in parallel, each agent working independently.

Start with subagents (simpler mental model). Graduate to agent teams when you have multiple independent features and trust the phases to run unsupervised.

---

## Core Concepts

### Three Knowledge Layers

**Context** — Stable project truth. Your architecture, tech stack, conventions, structure. Changes rarely. Loaded at the start of every phase to prime the agent with "how this project works."

**Research** — Volatile exploration. Domain discovery, technique investigation, competitive analysis. Gathered during the prime sub-phase when a phase needs external knowledge. May eventually become Context if the findings are stable and reusable.

**Meta** — Self-improvement. How to run phases better. Lives in the Beastmode plugin with project-specific overrides. Each phase can ask for self-analysis: "What went well? What should change next time?"

These layers have different lifecycles:
- Context evolves slowly (architecture decisions, tech stack)
- Research is ephemeral (specific to one feature or problem)
- Meta accumulates (learnings compound over time)

### Phase Anatomy

Every phase follows the same internal structure:

```
Input: Context + Meta + Research
              ↓
┌─────────────────────────────────────────┐
│  prime → execute → validate → checkpoint │
└─────────────────────────────────────────┘
              ↓
Output: Updated Context / Meta / Research
```

**prime** — Load context, gather research if needed. Get the agent ready to work.

**execute** — Do the actual work of the phase. Design, plan, code, test.

**validate** — Check the work. Does it meet criteria? Pass quality gates?

**checkpoint** — Save state. Write artifacts. Mark phase complete.

Phase properties:
- **Self-contained** — Phases don't orchestrate other phases. Each phase does its job and exits.
- **Clean session** — Each phase can run in a fresh agent session. No assumed state from previous runs.
- **Checkpoint recovery** — If a phase fails after checkpoint, restart from there.
- **Restartable** — Run the same phase multiple times. Useful for iteration or recovery.

---

## The Workflow

Five phases, linear flow:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│     Design  →  Plan  →  Implement  →  Validate  →  Release          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| Phase | Purpose | Input | Output |
|-------|---------|-------|--------|
| **Design** | Think before code | Feature request | Specs, approach decisions |
| **Plan** | Break down work | Design specs | Task list, implementation steps |
| **Implement** | Write the code | Task list | Code changes in worktree |
| **Validate** | Verify before merge | Code changes | Test results, quality gates |
| **Release** | Ship to main | Validated code | Merged PR, changelog |

Each phase runs the same sub-phases internally: prime → execute → validate → checkpoint.

**Design** asks: What are we building? Why? What approaches did we consider? What did we decide?

**Plan** asks: How do we break this into tasks? What order? What dependencies? What can be parallelized?

**Implement** asks: Execute the plan. Write code. Stay in the isolated worktree.

**Validate** asks: Does it work? Do tests pass? Does it meet the spec? Any quality issues?

**Release** asks: Merge to main. Create PR. Write changelog. Clean up worktree.

---

## Progressive Autonomy

The real power of Beastmode isn't the phases—it's how you control them.

### Stage 1: Full Human Control

Where everyone starts. Maximum visibility, minimum risk.

- Human triggers each phase manually (`/design`, `/plan`, etc.)
- Sub-phase gates require approval (prime done? execute done? validate done?)
- Human reviews artifacts between phases
- Nothing happens without explicit human action

This is how you learn what Beastmode does. Watch the phases. Understand the artifacts. Build intuition for what good output looks like.

### Stage 2: Intra-Phase Autonomy

Once you trust the phases, remove the internal gates.

- Sub-phase gates removed (prime → execute → validate → checkpoint runs without interruption)
- Phases complete autonomously once triggered
- Human acts as gate **between** phases
- Review happens at phase boundaries, not during execution

You still trigger `/design`, review the output, then trigger `/plan`. But each phase runs to completion without hand-holding.

### Stage 3: Agent Teams

Full autonomy. Features run independently.

- Features picked from shared tasklist
- Each feature runs Design → Plan → Implement → Validate → Release without human intervention
- Human orchestrates **which feature** to work on, not **how** to work on it
- Human may still own Design phase for complex features, delegate the rest

This is the end state: you describe what to build, agents figure out how to build it. You review PRs, not prompts.

**Configuration is per-project, per-phase.** You might run Design manually but let Implement run autonomous. You might keep Validate gated because your test suite is flaky. The system adapts to your trust level.

---

## Git-Native Architecture

Everything lives in Git. No external databases. No SaaS dependencies.

### Feature Isolation

Each feature gets:
- Own **git worktree** — isolated working directory
- Own **feature branch** — changes don't touch main until release
- Own **status tracking** — progress visible in artifacts

Phases run inside the worktree. Changes to Context, Meta, and Research stay in the feature branch until merged.

### Checkpoint & Recovery

Each phase writes a **git tag** after checkpoint. If something breaks:
1. Find the last successful tag
2. Reset to that point
3. Re-run the failed phase

No lost work. No corrupted state.

### Release Flow

When a feature completes:
1. **Release** creates PR attached to Feature Issue
2. PR squash-merges to main (single commit per feature)
3. Worktree cleaned up
4. Changelog generated

```
Feature lifecycle:

  BACKLOG → DESIGN → PLAN → IMPLEMENT → VALIDATE → [Release]
     │         │       │         │          │          │
     └─────────┴───────┴─────────┴──────────┴──────────┘
                    (in feature worktree)
```

### Pluggable Tasklist

Default: Git files track feature state.

Optional: GitHub Issues as tasklist backend.
- Feature = Issue labeled `BEASTMODE` + `FEATURE`
- Status = Issue labels: `BACKLOG`, `DESIGN`, `PLAN`, `IMPLEMENT`, `VALIDATE`

Choose based on team size and preference. Small team? Files are simpler. Larger team? Issues provide visibility.

---

## Context Structure

Context is scaffolded on project creation and evolves over time. Stored as markdown in Git. Three levels: L0 (product), L1 (summaries), L2 (details).

```
.beastmode/
├── PRODUCT.md              # L0: Product vision and goals
├── context/                # Build context (how to build)
│   ├── DESIGN.md           # L1: Design context summary
│   ├── design/             # L2: Architecture and tech stack
│   │   ├── architecture.md
│   │   └── tech-stack.md
│   ├── PLAN.md             # L1: Plan context summary
│   ├── plan/               # L2: Conventions and structure
│   │   ├── conventions.md
│   │   └── structure.md
│   ├── IMPLEMENT.md        # L1: Implement context summary
│   ├── implement/          # L2: Testing and agent rules
│   │   ├── agents.md
│   │   └── testing.md
│   ├── VALIDATE.md         # L1: Validate context summary
│   └── RELEASE.md          # L1: Release context summary
├── meta/                   # Self-improvement (learnings)
│   ├── DESIGN.md
│   ├── PLAN.md
│   ├── IMPLEMENT.md
│   ├── VALIDATE.md
│   └── RELEASE.md
└── state/                  # Feature tracking (kanban)
    ├── DESIGN.md
    ├── PLAN.md
    ├── IMPLEMENT.md
    ├── VALIDATE.md
    └── RELEASE.md
```

**L0** = Product vision (PRODUCT.md)
**L1** = Phase summaries (UPPERCASE.md) — always loaded
**L2** = Detailed docs (lowercase.md) — loaded on-demand via @imports

**Progressive enhancement:** Start minimal. Add detail as the project grows. Don't front-load documentation you don't need yet.

---

## Meta Layer

Meta tells phases how to do their job. Lives in the Beastmode plugin with project-specific overrides.

```
.beastmode/meta/
├── DESIGN.md      # How to run design better
├── PLAN.md        # How to run plan better
├── IMPLEMENT.md   # How to run implement better
├── VALIDATE.md    # How to run validate better
└── RELEASE.md     # How to run release better
```

**Plugin provides defaults.** Sensible behavior out of the box.

**Projects can override.** Your project has specific needs? Override the defaults.

**Self-improvement built in.** Each phase can ask: "What went well? What should change?" Answers feed back into Meta files.

This is how Beastmode gets smarter about **your** project over time. Not through magic—through explicit feedback loops.

---

## Roadmap

### Now
- 5-phase workflow (Design → Release)
- Claude Code primary
- Human orchestration with configurable gates
- Git-native state management

### Next
- **Integration phase** — Multi-feature coordination, merge conflict handling
- **Better onboarding** — Guided setup, project templates
- **Retro phase** — Meta-improvement outer loop (analyze sessions, update Meta)

### Later
- Other agentic tools (Cursor, Copilot Workspace)
- Team settings coordination
- GitHub Issues as tasklist backend

### Not Planned
- Product phase (deciding **what** to build) — Stay in Development lane
- CI/CD integration — Use existing tools
- Project management features — No sprints, no story points

---

## What Beastmode Is NOT

**Not a replacement for engineering judgment.** You still design. Agents assist. Final call is yours.

**Not project management.** No sprints. No story points. No standups. No burndown charts. Just engineering workflow.

**Not prescriptive about your stack.** Works with any language, framework, or toolchain. The workflow is stack-agnostic.

**Not autonomous by default.** You choose the leash length. Start with full control. Loosen as trust builds. The system doesn't decide for you.

**Not magic.** It's crystallized engineering lore—patterns that survived contact with reality. Structure helps. Structure isn't a substitute for thinking.

---

## Get Started

```bash
# Install the plugin
/plugin marketplace add bugroger/beastmode-marketplace
/plugin install beastmode@beastmode-marketplace

# Bootstrap a project
/bootstrap
```

Then: `/design` → `/plan` → `/implement` → `/validate` → `/release`

Use what helps. Skip what doesn't.
