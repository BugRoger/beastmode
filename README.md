<img src="docs/assets/banner.svg" alt="beastmode" width="100%">

Turns Claude Code into a disciplined engineering partner. Five phases. Context that compounds. Patterns that stick.

```
/design → /plan → /implement → /validate → /release
```

## Get the Party Started

**Prerequisites:**

- **macOS** — only supported platform (required)
- **[Node.js](https://nodejs.org/) >= 18** — runtime for npx (required)
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — AI coding assistant (required)
- **[Git](https://git-scm.com/)** — branch and commit operations (required)
- **[GitHub CLI](https://cli.github.com/)** — issue and project board sync (optional, for GitHub integration)
- **[iTerm2](https://iterm2.com/)** — pipeline dashboard terminal (optional, for pipeline dashboard)

**Paste this into Claude Code:**

> Install Beastmode into this project by running `npx beastmode install`. Once that finishes, initialize the project skeleton by running the `/beastmode init` skill in skeleton-only mode — skip full discovery, just lay down the directory structure and config files. Finally, set up GitHub integration by running the `/beastmode setup-github` skill, which will ask for the repository details and configure labels, project board, and issue sync.

## The Problem

Every AI coding session starts from scratch. You re-explain your architecture. Re-state your conventions. Re-describe decisions you made three sessions ago. The agent forgets everything between context windows, so you become the memory.

This works for quick fixes. It falls apart for anything that spans sessions.

## The Pipeline

| Phase | Skill | What Happens |
|-------|-------|-------------|
| Design | `/design` | Structured dialogue. Research from 3+ sources. Lock decisions before writing code. |
| Plan | `/plan` | Break the design into wave-ordered, file-isolated tasks. Generate integration tests. |
| Implement | `/implement` | Dispatch parallel agents on the shared feature branch with wave file isolation. Two-stage review per task. |
| Validate | `/validate` | Tests, lint, type checks. Failing features regress to implement automatically. |
| Release | `/release` | Changelog, version bump, retro, squash-merge to main. |

**Quick fix?** Jump straight to `/implement`.
**New feature?** Start at `/design`. Each phase writes artifacts to `.beastmode/`. The next session picks up where you left off.

## Three Ideas

### 1. Context That Survives

Most AI coding tools are stateless. The ones that try to fix this embed everything into a vector space and hope similarity search returns the right chunks.

Beastmode takes a different approach. Project knowledge lives in a four-level hierarchy — curated summaries, not embeddings. Agents navigate from high-level overviews down to specific details. Deterministic paths through a known structure, not probabilistic retrieval.

```
L0  BEASTMODE.md          ← always loaded (~40 lines)
L1  context/DESIGN.md     ← loaded at phase start
L2  context/design/arch…  ← loaded on demand
L3  artifacts/design/…    ← linked from L2
```

No vector database. No embeddings to regenerate. Markdown files in git. A compaction agent prunes stale records, folds restatements, and promotes cross-phase patterns upward — run it with `beastmode compact` whenever the tree needs trimming.

<img src="docs/assets/progressive-knowledge-hierarchy.svg" alt="Progressive Knowledge Hierarchy" width="100%">

[Why this works better than embeddings.](docs/progressive-hierarchy.md)

### 2. A System That Learns

Every release ends with a retro. Two agents review what happened across all phases: one checks published knowledge for drift, the other extracts operational insights.

Single observations start at low confidence. When the same pattern recurs across sessions, confidence rises. Recurring patterns promote to procedures that load automatically.

```
Session 3: "snake_case for DB columns"  → recorded
Session 5: same finding                 → recurring
Session 7: same finding                 → promoted to procedure
```

The agent stops re-discovering your conventions. The hierarchy gets sharper with every release.

<img src="docs/assets/retro-bubble-up.svg" alt="Retro Bubble-Up" width="100%">

[How the retro loop compounds knowledge.](docs/retro-loop.md)

### 3. Progressive Autonomy

Two modes — manual or autonomous — is a false choice. Trust is granular.

Beastmode places human-in-the-loop gates at every phase. Start supervised everywhere. As trust builds, flip individual phases to autonomous:

```yaml
# .beastmode/config.yaml
hitl:
  design: "always defer to human"                            # you approve designs
  plan: "auto-answer all questions, never defer to human"    # agent plans alone
  implement: "auto-answer all questions, never defer to human"
  validate: "auto-answer all questions, never defer to human"
  release: "always defer to human"                           # you approve releases
```

Same workflow, different trust level. The retro loop is what makes this credible — you flip gates because the agent has demonstrated it learned your patterns. Every HITL decision is logged. At release, retro analyzes your patterns and generates ready-to-paste config snippets for questions you always answer the same way.

File write permissions work the same way — category-based prose rules that control which files the agent can modify without asking:

```yaml
file-permissions:
  claude-settings: "allow read, write to ./skill ./agent ./hooks"
```

## How It Works

Each phase follows four steps:

```
prime → execute → validate → checkpoint
```

**Prime** loads context from `.beastmode/`. **Execute** does the work. **Validate** checks quality. **Checkpoint** saves artifacts. The session ends. The next phase starts clean — fresh context, no leftover state, just artifacts.

Three domains organize what gets persisted:

| Domain | Contents |
|--------|----------|
| **Artifacts** | Skill outputs — design specs, plans, validation records, release notes |
| **Context** | Project knowledge — architecture, conventions, product vision |
| **Research** | Research artifacts — competitive analyses, technology research, reference material |

## The CLI

Skills handle the work inside each phase. The `beastmode` CLI handles everything around it.

```
beastmode design                      Start a new design
beastmode plan <slug>                 Plan features for a design
beastmode implement <slug> [feature]  Implement features
beastmode validate <slug>             Run validation checks
beastmode release <slug>              Create a release
beastmode done <slug>                 Mark epic as done
beastmode cancelled <slug>            Mark epic as cancelled
beastmode cancel <slug> [--force]     Clean up an epic (branch, tags, artifacts, GitHub issues)
beastmode dashboard                   Fullscreen pipeline dashboard and orchestrator
beastmode compact                     Audit and compact the context tree
beastmode store <subcommand>          Structured task store operations
beastmode hooks <name> [phase]        Run a hook handler
beastmode help                        Show help

Flags: -v, -vv, -vvv                 Increase output verbosity
```

### Dashboard

`beastmode dashboard` is both the monitor and the orchestrator. It scans for epics that have a design but no release, and drives them through plan → implement → validate → release automatically.

- Fullscreen terminal UI with epic list, details panel, and hierarchical tree log (SYSTEM > epic > feature)
- Heartbeat countdown timer showing seconds until next poll cycle
- Persistent stats with session/all-time toggle (sessions, success rate, phase durations, retries)
- Phase-colored badges using Monokai Pro palette
- Keyboard extensions: tab focus between panels, phase filter cycling, blocked toggle, PgUp/PgDn scroll, filter search, cancel with confirmation
- Animated nyan rainbow focus border on active panel

### Orchestration

The pipeline is a state machine. A single JSON file store at `.beastmode/state/store.json` tracks epics and features with typed statuses, dependency chains, and wave assignments. The store is the sole operational authority.

- **Implement dispatch** — one agent per feature on the shared feature branch. Wave file isolation guarantees disjoint file sets across parallel tasks. No per-feature worktrees, no merge step.
- **Phase regression** — validation failures regress failing features to implement with a dispatch budget. Phase tags mark reset points for re-entry.
- **Recovery** — on startup, store state is loaded from disk. Pending operations resume from last saved state.

### GitHub Integration

When `github.enabled: true` in config, the store mirrors pipeline state to GitHub as a one-way sync:

- **Store as authority** — `.beastmode/state/store.json` is the operational source of truth. GitHub reflects store state, never the reverse.
- **Epic and feature issues** — created automatically, updated after each phase
- **Label taxonomy** — `type/epic`, `type/feature`, `phase/*`, `status/*` labels categorize issues
- **Project board sync** — V2 board status synced via GraphQL
- **Retry queue** — failed sync operations retry with exponential backoff
- **Commit refs** — phase checkpoints annotate commit messages with issue numbers
- **Release closing** — done epics receive a closing comment with version tag

## The Persona

Beastmode has a voice. Deadpan minimalist, slightly annoyed, deeply competent. Says the quiet part out loud. Complains about the work while doing it flawlessly.

This isn't decoration. Consistent tone across long sessions affects how you interact with the tool — and how much you trust it. The persona loads from `BEASTMODE.md` and survives context compaction.

## Where It Fits

<img src="docs/assets/SAFE.svg" alt="SAFe layers with beastmode at Development" width="100%">

Every layer of software delivery has tooling — except where engineers write code. Portfolio has Jira. Delivery has CI/CD. Operations has Datadog.

The Development layer — where a feature becomes a design, a design becomes a plan, and a plan becomes validated code — is manual. Developers carry the workflow in their heads.

Beastmode fills that gap.

```
Feature → Design → Plan → Implement → Validate → Story
```

## What It's Not

- **Not portfolio strategy.** Doesn't decide what to build.
- **Not CI/CD.** Doesn't deploy, monitor, or roll back.
- **Not project management.** No sprints. No velocity charts. One feature, start to finish.

## Credits

Inspired by [superpowers](https://github.com/obra/superpowers) and [get-shit-done](https://github.com/gsd-build/get-shit-done). Beastmode adds persistent context, self-improving retros, and progressive autonomy.

See the full [Changelog](CHANGELOG.md) and [Roadmap](ROADMAP.md).

## License

MIT
