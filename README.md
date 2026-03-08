<img src="docs/assets/banner.svg" alt="beastmode" width="100%">

A disciplined engineering partner for Claude Code.

Without structure, you re-explain your project every session, lose decisions between context windows, and get inconsistent results. Beastmode fixes this. Five phases. Context persists. Patterns compound.

```
/design → /plan → /implement → /validate → /release
```

## What It Does

**Quick fix?** Jump to `/implement`.
**New feature?** Design the approach. Plan the tasks. Implement. Validate. Release.
**Multi-session?** Each phase writes artifacts to `.beastmode/`. The next session picks up where you left off.

## Install

```bash
claude plugin add beastmode@beastmode-marketplace
```

Then initialize your project:

```bash
/beastmode install                # scaffold .beastmode/ structure
/beastmode init --brownfield      # auto-discover existing codebase
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/design` | Turn ideas into design specs through dialogue |
| `/plan` | Break designs into bite-sized implementation tasks |
| `/implement` | Execute plans in isolated git worktrees |
| `/validate` | Quality gate — tests, lint, type checks |
| `/release` | Changelog, version bump, squash-merge to main |
| `/status` | Show project state and milestones |
| `/beastmode` | Project initialization and discovery |

## How It Works

Each phase follows four steps:

```
prime → execute → validate → checkpoint
```

Prime loads context from `.beastmode/`. Execute does the work. Validate checks quality. Checkpoint saves artifacts. The session ends. The next phase starts clean — fresh context, no leftover state, just the artifacts the previous phase wrote.

`.beastmode/` is the shared bus. Design specs, implementation plans, validation records, release notes. All markdown, all in git. Your root `CLAUDE.md` imports the project context. Every session starts with full knowledge of your project.

Three domains organize what gets persisted:

- **Context** — what the project knows (architecture, conventions, product vision)
- **State** — where features are in the workflow (design through release)
- **Meta** — what you've learned (procedures, process insights, project-specific rules)

## What's Different

**Context that survives sessions.**

Most AI coding tools are stateless. Every session starts from zero. You re-describe your architecture, re-explain your conventions, re-state your preferences.

Beastmode persists project knowledge in `.beastmode/` — organized into four levels, each summarizing the level below. Agents navigate summaries first, then load detail when the task demands it. Deterministic navigation through a known structure, not similarity search through a vector space.

<img src="docs/assets/progressive-knowledge-hierarchy.svg" alt="Progressive Knowledge Hierarchy" width="100%">

No vector database to maintain. No embeddings to regenerate. Context survives sessions, branches, and collaborators — markdown files in git.

[Read the full argument.](docs/progressive-hierarchy.md)

**A system that learns from experience.**

Most AI coding tools treat every session as their first. Past mistakes teach nothing. Solved problems recur.

Beastmode captures what worked and what failed at every checkpoint. Retro agents review each finding and record it with a confidence level. Recurring patterns promote to procedures that load automatically in future sessions. Each cycle sharpens Claude's understanding of *your* codebase, not codebases in general.

<img src="docs/assets/retro-bubble-up.svg" alt="Retro Bubble-Up" width="100%">

[Read the full argument.](docs/retro-loop.md)

**Progressive autonomy through configurable gates.**

Most AI coding tools offer two modes: manual or autonomous. No middle ground.

Beastmode places human-in-the-loop gates at every decision point: design approval, plan review, version confirmation, merge strategy. Gates default to human. As trust builds, flip individual gates to `auto` in `.beastmode/config.yaml`:

```yaml
# .beastmode/config.yaml
gates:
  design:
    intent-discussion: human      # start supervised
    design-approval: human
  plan:
    plan-approval: auto           # trust the plan phase
  implement:
    architectural-deviation: auto # claude handles deviations
transitions:
  design-to-plan: auto            # auto-chain between phases
  plan-to-implement: auto
```

[Read the full argument.](docs/configurable-gates.md)

Same workflow, different trust level. The structure scales from supervised to autonomous.

## Why?

Software moves through layers.

<img src="docs/assets/SAFE.svg" alt="SAFe layers with beastmode at Development" width="100%">

Portfolio decides what matters. Program breaks it into features. Development turns features into code. Delivery ships it. Operations keeps it alive. SAFe formalizes this into five layers, each with its own rituals, roles, and artifacts.

Every layer has tooling — except where engineers write the code.

Portfolio has Jira, Aha!, ProductBoard. Program has PI planning boards and capacity calculators. Delivery has CI/CD pipelines, feature flags, deployment orchestrators. Operations has Datadog, PagerDuty, Kubernetes.

Development? You get an IDE and good luck.

The Development layer — where a feature becomes a design, a design becomes a plan, a plan becomes code, and code becomes a validated story — has no structural tooling. Developers carry the workflow in their heads. Context lives in memory. Decisions evaporate between sessions. The handoff from "I understand the feature" to "here's a tested story" is manual.

Beastmode fills that gap. Not portfolio strategy. Not CI/CD. Not monitoring. Five phases that turn a feature into working code:

```
Feature → Design → Plan → Implement → Validate → Story
```

The gap nobody tools for, because it's "just development." But this layer loses the most context, generates the most rework, and gives AI agents the most leverage — if they have structure.

## Credits

Inspired by [superpowers](https://github.com/obra/superpowers) and [get-shit-done](https://github.com/gsd-build/get-shit-done). Beastmode adds persistent context, self-improving retros, and progressive autonomy.

See the full [Changelog](CHANGELOG.md) and [Roadmap](ROADMAP.md).

## License

MIT
