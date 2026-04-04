# Competitive Analysis: Beads vs Beastmode
*Research Date: 2026-04-04*

## Executive Summary

Beads and Beastmode solve different problems that happen to share a surface: making AI coding agents more effective at long-horizon work. Beads is a **persistence layer** -- a distributed graph issue tracker that gives agents structured, queryable memory across sessions and branches. Beastmode is a **workflow system** -- an opinionated five-phase engineering process that turns Claude Code into a disciplined engineering partner with design, planning, implementation, validation, and release phases. The fundamental difference: Beads answers "what should the agent work on next and what does it remember?" while Beastmode answers "how should the agent work and what quality bar must it meet?"

Beads has meaningful traction (~14-20k GitHub stars, 199 contributors, 85 releases, Steve Yegge's media presence) and occupies the "agent memory" category that is rapidly being validated by the market. Beastmode has deeper workflow discipline, richer knowledge management, and an opinionated engineering process that Beads does not attempt. They are more complementary than competitive -- but Beads' task-graph primitives could eventually absorb workflow concerns, and that convergence is worth watching.

The strategic question is not "Beads or Beastmode" but "should Beastmode adopt structured task persistence, and if so, should it build or integrate?" Beads' best ideas -- hash-based collision-free IDs, dependency-aware ready-work detection, semantic compaction -- are genuinely good and could strengthen Beastmode's implementation phase. Meanwhile, nothing in Beads approaches Beastmode's design discipline, knowledge hierarchy, or quality gates.

## Market Context

### The AI Agent Workflow Space (2025-2026)

The market has segmented into three tiers:

**Tier 1 -- Agent Memory & Task Tracking**: Tools that give agents persistent state across sessions. Beads is the standout here, alongside Mem0 (raised $24M, became AWS Agent SDK's exclusive memory provider), Zep (temporal knowledge graphs, 18.5% accuracy improvement), and native approaches like Claude Code's built-in task tracking. The core insight driving this tier: agents forget everything between sessions, and markdown plans are fragile.

**Tier 2 -- Agent Orchestration Frameworks**: Multi-agent coordination systems like LangGraph, CrewAI, AutoGen/Microsoft Agent Framework. These handle routing, delegation, and state management across multiple agents. They are infrastructure-level -- think "Kubernetes for agents" -- and mostly compete with each other, not with Beads or Beastmode.

**Tier 3 -- Opinionated Workflow Systems**: Tools that enforce a specific engineering process on agent work. Beastmode is essentially alone here. Most teams roll their own CLAUDE.md and AGENTS.md files. The market has not yet converged on whether this tier is a product category or a practice.

**Key trend**: Gartner predicts 40% of enterprise applications will embed AI agents by end of 2026, up from <5% in 2025. Memory and coordination infrastructure is becoming table stakes. Anthropic's own "2026 Agentic Coding Trends Report" validates the space.

### Steve Yegge's Role

Yegge (ex-Google, ex-Amazon, now Sourcegraph/Amp) built Beads as the persistence layer extracted from Gas Town, his multi-agent AI orchestration system. Gas Town is an open-source project (not a company) that spawns specialized agents (Mayor, Rigs, Polecats) coordinated through Beads. His media presence is significant:

- Book: *Vibe Coding*, outlining AI-augmented workflows
- Talk: "2026: The Year the IDE Died" at AI Engineer Code Summit (Nov 2025)
- Interview: Pragmatic Engineer podcast on 8 levels of AI adoption
- Multiple Medium posts: "Introducing Beads," "The Beads Revolution," "Beads Best Practices"
- Podcast positioning Beads as "the must-have tool for any developer working with AI agents" (Feb 2026)

He has the platform and credibility to shape the narrative around agent memory. When he says "agents need persistent task memory," people listen.

## Head-to-Head Comparison

### Architecture & Storage

| Dimension | Beads | Beastmode |
|-----------|-------|-----------|
| **Storage backend** | Dolt (version-controlled SQL database) with cell-level merge | Markdown files, .tasks.md, state/ directory, manifest JSON |
| **Data location** | `.beads/` with embedded Dolt or external Dolt server | `.beastmode/state/` (gitignored), `.beastmode/context/` (committed) |
| **Query capability** | Full SQL via Dolt, `--json` on every command, `bd query` for raw SQL | File reads, grep-based cross-file verification |
| **Version control** | Native Dolt branching + commit history + cell-level merge | Git-only, squash-merge at release, archive tags for history |
| **Conflict resolution** | Hash-based IDs eliminate collisions; Dolt cell-level 3-way merge | Wave-based file isolation prevents conflicts; git merge-tree pre-check |
| **Offline support** | Full offline operation, sync via git push/pull | Full offline (markdown is inherently offline-first) |
| **External dependencies** | Dolt (embedded or server), CGO required for build | None beyond Claude Code and git |
| **Portability** | JSONL export, Dolt backup/restore, federation sync | Git clone (everything is files) |

**Assessment**: Beads has a genuinely superior storage layer. Dolt gives it queryable, mergeable, version-controlled structured data. Beastmode's markdown approach is simpler but less powerful -- you cannot run SQL queries against .tasks.md files. However, Beastmode's simplicity is also its strength: zero dependencies, zero setup, git-native everything.

### Agent Coordination Model

**Beads**: Multiple "crew" agents push directly to main, coordinated via Dolt database concurrency. The `bd ready` command computes transitive blocking dependencies in ~10ms to surface unblocked tasks. Atomic `--claim` prevents double-assignment. Hash-based IDs (bd-a1b2) ensure zero merge collisions across branches. Server mode supports true concurrent writes; embedded mode is single-writer with file locking. The "landing the plane" protocol mandates push-to-main before session end -- "NEVER create pull requests" for crew workers.

**Beastmode**: Wave-based parallel execution with strict file isolation across tasks. Per-feature worktrees (impl/<slug>--<feature>) isolate agents at the git branch level. After parallel agents finish, CLI merges worktrees sequentially with pre-merge conflict simulation via `git merge-tree`. Manifest JSON tracks feature lifecycle. GitHub Issues + Labels serve as the synced mirror for human visibility.

| Coordination Aspect | Beads | Beastmode |
|---------------------|-------|-----------|
| **Concurrency model** | Push-to-main, Dolt database-level concurrency | Worktree isolation, sequential merge |
| **Task assignment** | Atomic `--claim`, `bd ready --assignee` | CLI dispatch per wave, manifest state tracking |
| **Conflict prevention** | Hash IDs + cell-level merge | File isolation analysis across waves |
| **Multi-agent visibility** | `bd list --assignee`, SQL queries | Pipeline dashboard (`beastmode status --watch`) |
| **PR model** | No PRs -- direct push to main | Squash-merge PR at release |

**Assessment**: Fundamentally different philosophies. Beads trusts the database to resolve conflicts and lets agents push directly. Beastmode trusts process isolation (separate files, separate branches) and merges under CLI control. Beads' model is faster and more fluid but riskier -- a bad push can break main. Beastmode's model is safer but more rigid. For solo-developer-with-agents, Beads wins on velocity. For teams with quality gates, Beastmode wins on safety.

### Workflow Philosophy

**Beads**: Deliberately unopinionated about *how* you work. It tracks tasks, dependencies, and state. It does not tell you what to do next beyond "here are unblocked tasks." The `bd prime` command loads context for the current session, and compaction summarizes old work, but there is no design-plan-implement-validate-release pipeline. The workflow emerges from how you use the graph, not from the tool.

**Beastmode**: Radically opinionated. Five mandatory phases (design, plan, implement, validate, release) with sub-phase anatomy (prime, execute, validate, checkpoint). Each phase has a skill file, quality gates, and a checkpoint that commits work. Design requires 3+ external sources. Plans must enumerate concrete tables. Implementation requires write plans with TDD cycles. Validation runs quality gates. Release includes retro and knowledge promotion. The persona ("deadpan minimalist, slightly annoyed, deeply competent") is part of the system.

**Assessment**: This is the deepest divergence. Beads is a tool; Beastmode is a methodology embodied in tooling. Beads' flexibility is its adoption advantage -- it works with any workflow. Beastmode's rigidity is its quality advantage -- it prevents agents from cutting corners. Neither approach is wrong; they serve different maturity levels. A team that has already internalized engineering discipline benefits from Beads' flexibility. A team (or solo developer) that needs guardrails benefits from Beastmode's structure.

### Knowledge & Context Management

| Dimension | Beads | Beastmode |
|-----------|-------|-----------|
| **Persistence model** | Dolt database with task history and audit trail | Four-level hierarchy (L0-L3), context/ committed to git |
| **Compaction** | Semantic "memory decay" -- summarizes old closed tasks to save context window | Context tree compaction agent with staleness check, value-add gate, L0 promotion detection |
| **Session priming** | `bd prime` loads current context | L0 autoloads, L1 at prime, L2 on-demand, L3 linked from L2 |
| **Knowledge promotion** | Not applicable -- flat task store | Retro promotes artifacts upward through hierarchy; context walker reviews all phase artifacts at release |
| **Cross-session memory** | Full -- Dolt persists everything, compaction summarizes old tasks | Full -- context/ and state/ persist; manifests track feature lifecycle |
| **Graph relationships** | `relates_to`, `duplicates`, `supersedes`, `replies_to` | Dependency graph for wave ordering, but no explicit relationship types between knowledge artifacts |

**Assessment**: Both systems address the "50 First Dates" problem (agents forgetting everything between sessions), but through very different mechanisms. Beads gives agents a queryable database of tasks with graph relationships. Beastmode gives agents a curated knowledge hierarchy that gets smarter over time through retro. Beads' compaction is about saving tokens; Beastmode's compaction is about improving knowledge quality. The knowledge hierarchy is Beastmode's most distinctive feature -- nothing in the market does this.

### Developer Experience

| Dimension | Beads | Beastmode |
|-----------|-------|-----------|
| **Installation** | `npm install -g @beads/bd`, `brew install beads`, `go install`, or curl script | Clone repo, Claude plugin system |
| **Setup** | `bd init` in your project (system-wide tool) | `.beastmode/` directory in your project |
| **Learning curve** | Low -- `bd create`, `bd ready`, `bd close` | High -- five phases, sub-phase anatomy, knowledge hierarchy, HITL config |
| **Platform support** | macOS, Linux, Windows, FreeBSD | Wherever Claude Code runs (macOS, Linux primarily) |
| **Agent agnostic** | Yes -- `--json` output works with any agent, MCP server, Claude plugin | No -- tightly coupled to Claude Code |
| **Persona/character** | None -- pure utility | Core feature -- "deadpan minimalist, slightly annoyed" |
| **CLI ergonomics** | Extensive: 30+ commands, `--json` on everything, streaming, piping | CLI commands for phases + status + orchestration |
| **Stealth mode** | `bd init --stealth` for personal use on shared projects | Not applicable -- project-level install |

**Assessment**: Beads wins on breadth of access and low friction. You can install it in 30 seconds on any platform and it works with any agent. Beastmode is Claude-Code-only and has a significant learning curve. However, Beastmode's tight coupling is also its strength -- it can leverage Claude Code's specific capabilities (skills, hooks, worktrees) in ways a generic tool cannot.

### Extensibility & Integration

| Dimension | Beads | Beastmode |
|-----------|-------|-----------|
| **Plugin model** | Claude Code plugin, MCP server (Python/PyPI), `--json` CLI for any integration | Claude Code plugin (skills-based), TypeScript CLI |
| **MCP** | Full MCP server with auto workspace detection | Uses MCP servers but does not expose one |
| **Federation** | Peer-to-peer sync via Dolt remotes (DoltHub, S3, GCS, local, SSH). Data sovereignty tiers (T1-T4) | None -- single-repo model |
| **GitHub integration** | Optional -- works without git entirely | Deep -- GitHub labels as source of truth, project boards, issue sync |
| **Community tools** | Neovim plugin, web UIs, terminal interfaces, editor extensions | Skill library, skill distribution system |
| **Agent support** | Any agent with CLI or MCP access | Claude Code only |

**Assessment**: Beads has broader integration surface. Federation is genuinely novel -- syncing task databases across organizations with data sovereignty tiers is an enterprise-grade feature. Beastmode has deeper GitHub integration (labels as source of truth, project board sync) but narrower reach. The "Claude Code only" constraint is Beastmode's biggest limitation for adoption.

## Unique Strengths

### What Beads Does That Beastmode Doesn't

1. **Queryable structured database**: Full SQL against a Dolt database. You can write `SELECT * FROM issues WHERE priority = 0 AND status = 'open'` and get results. Beastmode has no equivalent -- everything is file-based grep.

2. **Hash-based collision-free IDs**: `bd-a1b2` IDs are generated from random UUIDs, eliminating merge collisions when multiple agents create tasks on different branches. Beastmode relies on file isolation to prevent conflicts, which is more fragile.

3. **Deterministic ready-work detection**: `bd ready` computes transitive blocking dependencies offline in ~10ms. Beastmode's wave ordering is similar in concept but computed at plan time, not dynamically.

4. **Federation**: Peer-to-peer sync between workspaces with data sovereignty tiers. No equivalent in Beastmode.

5. **Agent-agnostic design**: Works with Claude Code, Cursor, Copilot, Aider, or any agent that can call CLI commands or use MCP. Beastmode is Claude-Code-exclusive.

6. **Hierarchical issue IDs**: `bd-a3f8 > bd-a3f8.1 > bd-a3f8.1.1` provides human-readable epic/task/subtask structure. Beastmode's manifest JSON tracks features but without this compact addressing scheme.

7. **Git-free operation**: `bd init --stealth` works without git. Useful for monorepos, non-git VCS, CI/CD, or air-gapped environments.

8. **Message threading**: Message issue type with `--thread`, ephemeral lifecycle, and mail delegation. Agent-to-agent communication primitive.

**Value assessment**: Items 1, 2, 3, and 5 are genuinely high-value capabilities. Federation (4) is impressive but more relevant for multi-team enterprises than solo developers. Git-free operation (7) is nice-to-have. Message threading (8) is interesting but unproven in practice.

### What Beastmode Does That Beads Doesn't

1. **Opinionated engineering process**: Five phases with mandatory quality gates. Beads tracks tasks but does not enforce how you work on them. Beastmode prevents agents from skipping design, cutting corners on plans, or shipping without validation.

2. **Knowledge hierarchy with retro promotion**: L0-L3 hierarchy where retro automatically promotes learnings from artifacts through context levels. Over time, the system gets smarter about its own codebase. Beads' compaction discards old information; Beastmode's retro distills it.

3. **Design-time discipline**: Mandatory 3+ external sources for structural decisions, concrete enumeration tables for N-instance decisions, starting from existing algorithms. Beads has no design phase.

4. **Two-stage code review**: Spec compliance first, then code quality. Ordered pipeline, not optional. Beads has no review process.

5. **Pipeline orchestration with live dashboard**: `beastmode status --watch` with 2-second polling, ANSI full-screen redraw, change highlighting, multi-epic parallelism, per-feature agent fan-out. Beads has `bd list` but no live operational dashboard.

6. **HITL controls**: Per-phase human-in-the-loop settings. Design can require human approval while implementation runs autonomously. Beads has no concept of human gates in the workflow.

7. **Persona system**: Character-driven interactions with consistent tone. This sounds trivial but meaningfully affects user engagement and trust in long sessions.

8. **Context tree compaction with value-add gate**: Compaction agent that checks proposed L3 records against parent L2 before creation, runs staleness analysis, and flags ambiguous cases for human review. More sophisticated than Beads' "summarize old tasks."

**Value assessment**: Items 1, 2, and 6 are category-defining advantages. The knowledge hierarchy (2) is Beastmode's most defensible feature -- it creates compounding value over time. Design discipline (3) and two-stage review (4) are high-value for code quality. Pipeline dashboard (5) is operationally useful. Persona (7) is surprisingly sticky in practice.

## Threat Assessment

### Is Beads a competitor, complement, or irrelevant?

**Complement, trending toward adjacent competitor.**

Today, they solve different problems with minimal overlap. You could theoretically use Beads *inside* Beastmode as the task persistence layer for the implementation phase, replacing .tasks.md with `bd` commands.

However, two convergence vectors exist:

1. **Beads absorbing workflow**: Gas Town (Beads' parent system) already has specialized agent roles (Mayor, Rigs, Polecats) and workflow orchestration. If Gas Town's workflow patterns mature and get packaged as defaults, Beads+Gas Town becomes a competitor to Beastmode's full pipeline.

2. **Market narrative**: Yegge is shaping the "agents need memory" narrative. If the market decides that memory/persistence is the hard problem and workflow is just convention, Beastmode's differentiation gets harder to explain. "We enforce a five-phase process" is a harder sell than "we give your agent a brain."

**What would it take to converge?**

- Beads would need: opinionated workflow phases, quality gates, knowledge hierarchy, HITL controls, design discipline enforcement
- Beastmode would need: structured queryable persistence, hash-based collision-free IDs, federation, agent-agnostic interface, dynamic ready-work computation

The gap is significant in both directions. Neither is a weekend project.

### Risk Level: Medium

Beads is not an immediate threat because:
- It does not compete on workflow discipline (Beastmode's core value)
- It is agent-agnostic (broader but shallower integration)
- Its "push to main, never PR" model is incompatible with Beastmode's quality-gate philosophy

Beads is a medium-term concern because:
- It has significant mindshare (Yegge's platform, 14-20k stars)
- Gas Town's multi-agent orchestration is directionally competitive
- The market may decide persistence matters more than process
- Beads' Dolt backend is objectively better than markdown files for structured task data

## Strategic Recommendations

### 1. Adopt structured task persistence (high priority)

Beastmode's .tasks.md and manifest JSON work but are fragile compared to a queryable database. Consider:
- **Option A**: Integrate Beads as an optional task backend for the implementation phase. `bd create` and `bd ready` replace .tasks.md parsing. This adds Beads as a dependency but gains its best primitives.
- **Option B**: Build a lightweight structured store (SQLite, even a local JSON-based store with indexed fields) that provides query and collision-free ID capabilities without Dolt's weight.
- **Recommendation**: Option B for now. Keep the zero-dependency story intact. Revisit Option A if Beads reaches 1.0 and federation becomes relevant.

### 2. Steal hash-based IDs for task/feature tracking (low effort, high value)

Beastmode's manifest uses slug-based feature names that can collide in multi-worktree scenarios. Hash-based IDs with hierarchical structure (like Beads' `bd-a3f8.1`) would be a direct improvement to manifest robustness.

### 3. Add dynamic ready-work computation (medium priority)

Beastmode computes wave ordering at plan time. Adding a runtime `beastmode ready` command that evaluates dependency state dynamically (like `bd ready`) would enable better recovery from partial failures and more flexible re-planning.

### 4. Consider agent-agnostic interfaces for the plan/validate phases (long-term)

Beastmode's Claude-Code-only constraint limits adoption. The design and implementation phases are deeply integrated with Claude Code's capabilities, but the plan output format and validation gate logic could be exposed via MCP or CLI for use with other agents. This does not mean rebuilding everything -- just defining a contract layer.

### 5. Double down on knowledge hierarchy as the moat (ongoing)

The L0-L3 hierarchy with retro promotion is Beastmode's most defensible feature. Nothing in Beads, Gas Town, or the broader market attempts this. Every release that refines the compaction agent, the value-add gate, and the retro walker increases the switching cost. This is the feature to invest in, market, and protect. When someone asks "why Beastmode and not Beads?" the answer should be: "Beads gives your agent a to-do list. Beastmode gives your agent institutional memory that gets smarter every release."

## Sources

### Beads (Primary)
- GitHub Repository: https://github.com/steveyegge/beads
- GitHub (gastownhall mirror): https://github.com/gastownhall/beads
- README, AGENT_INSTRUCTIONS.md, FAQ.md, FEDERATION-SETUP.md, ARTICLES.md (read directly from repo)
- npm: https://www.npmjs.com/package/@beads/bd
- PyPI: https://pypi.org/project/beads-mcp/

### Steve Yegge / Gas Town
- "Introducing Beads: A Coding Agent Memory System": https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a
- "Welcome to Gas Town": https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04
- "The Beads Revolution": https://steve-yegge.medium.com/the-beads-revolution-how-i-built-the-todo-system-that-ai-agents-actually-want-to-use-228a5f9be2a9
- Software Engineering Daily interview (Feb 2026): https://softwareengineeringdaily.com/2026/02/12/gas-town-beads-and-the-rise-of-agentic-development-with-steve-yegge/
- "2026: The Year the IDE Died" (AI Engineer Code Summit, Nov 2025): https://www.startuphub.ai/ai-news/ai-video/2025/the-ide-is-dead-yegge-predicts-ais-overhaul-of-software-development-by-2026
- Pragmatic Engineer podcast: https://newsletter.pragmaticengineer.com/p/steve-yegge-on-ai-agents-and-the

### Community / Third-Party
- Trilogy AI (dependency enforcement): https://trilogyai.substack.com/p/how-to-fix-your-ai-agents-keep-cutting
- "From Beads to Tasks: Anthropic Productizes Agent Memory": https://paddo.dev/blog/from-beads-to-tasks/
- "GasTown and the Two Kinds of Multi-Agent": https://paddo.dev/blog/gastown-two-kinds-of-multi-agent/
- VirtusLab (Beads overview): https://virtuslab.com/blog/ai/beads-give-ai-memory/
- DoltHub (Gas Town day-in-the-life): https://www.dolthub.com/blog/2026-01-15-a-day-in-gas-town/
- Cloud Native Now (Gas Town as K8s for agents): https://cloudnativenow.com/features/gas-town-what-kubernetes-for-ai-coding-agents-actually-looks-like/
- GitHub Discussions (quickstart friction): https://github.com/steveyegge/beads/discussions/848
- Rust port (portability signal): https://github.com/Dicklesworthstone/beads_rust

### Market Context
- Mem0 State of AI Agent Memory 2026: https://mem0.ai/blog/state-of-ai-agent-memory-2026
- StackOne AI Agent Tools Landscape 2026: https://www.stackone.com/blog/ai-agent-tools-landscape-2026
- Machine Learning Mastery Agentic AI Trends: https://machinelearningmastery.com/7-agentic-ai-trends-to-watch-in-2026/
- Anthropic 2026 Agentic Coding Trends Report: https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf
- CIO Agent Orchestration Tools: https://www.cio.com/article/4138739/21-agent-orchestration-tools-for-managing-your-ai-fleet.html
- Dolt Documentation: https://docs.dolthub.com/sql-reference/version-control

### Beastmode (Internal)
- `.beastmode/BEASTMODE.md` -- Prime directives, persona, workflow rules
- `.beastmode/config.yaml` -- CLI, GitHub, HITL configuration
- `.beastmode/context/design/architecture.md` -- Knowledge hierarchy, data domains, sub-phase anatomy
- `.beastmode/context/design/architecture/component-architecture.md` -- Skills vs agents separation
- `.beastmode/context/design/architecture/worktree-isolation.md` -- CLI-owned worktree lifecycle
- `.beastmode/context/design/compaction.md` -- Context tree compaction and value-add gate
- `.beastmode/context/design/product/core-capabilities.md` -- Full feature set enumeration
