# Research: everything-claude-code (ECC)

**Date:** 2026-03-05
**Phase:** design
**Objective:** Competitive analysis of the most popular Claude Code enhancement repo (61K+ stars) to understand its architecture, strengths, weaknesses, and how it compares to beastmode.

## Summary

ECC is a massive collection of pre-built configs, skills, agents, commands, hooks, and rules for Claude Code (plus Cursor, Codex, OpenCode). It is a curated library of reusable components, not a workflow system. At 61K stars and 7.6K forks, it is by far the most popular Claude Code tooling project. Its strengths are breadth (50+ skills, 33 commands, 13 agents, 29 rules across 6 languages), community engagement, and practical documentation. Its weakness is that it is fundamentally a grab-bag of independent pieces with no unifying workflow model, no persistent project context, and no self-improving feedback loop.

## Repository Stats

| Metric | Value |
|--------|-------|
| Stars | 61,419 |
| Forks | 7,599 |
| Contributors | 30+ |
| Created | 2026-01-18 |
| Last pushed | 2026-03-05 |
| Version | 1.7.0 |
| License | MIT |
| Language | JavaScript (scripts), Markdown (content) |
| Author | Affaan Mustafa (@affaan-m) |
| Credential | Anthropic Hackathon Winner |
| Website | ecc.tools |

## Architecture

### Component Model (Flat, Not Hierarchical)

ECC organizes content into 7 top-level directories with no inter-component dependency structure:

```
agents/          13 specialized subagents (markdown with YAML frontmatter)
skills/          50+ workflow/domain knowledge files (markdown SKILL.md per dir)
commands/        33 slash commands (markdown with description frontmatter)
rules/           29 always-loaded guidelines (common/ + per-language dirs)
hooks/           hooks.json with 9 event-based automations (Node.js scripts)
contexts/        3 dynamic system prompt injection files (dev, research, review)
mcp-configs/     MCP server configuration templates
```

### Key Architectural Decisions

1. **Plugin distribution**: Ships as a Claude Code plugin via marketplace. Rules require manual install (upstream limitation).
2. **Cross-platform**: Adapters for Cursor (.cursor/), Codex (.codex/), OpenCode (.opencode/). AGENTS.md at root works on all.
3. **No project state**: No equivalent of .beastmode/. Each session starts fresh unless hooks persist context to tmp files.
4. **No knowledge hierarchy**: Everything is flat. CLAUDE.md is a simple overview, not a progressive loader.
5. **Hook-first automation**: Uses Claude Code hooks extensively (PreToolUse, PostToolUse, SessionStart, SessionEnd, PreCompact, Stop).

### Skill Format

Skills live in `skills/{name}/SKILL.md` with optional supporting files:

```yaml
---
name: skill-name
description: What it does
origin: ECC
version: x.y.z
---
```

Body is free-form markdown with "When to Activate", "How It Works", "Code Examples", "Best Practices" sections. No standardized phase anatomy. No @import mechanism. Skills are standalone documents.

### Agent Format

Agents live in `agents/{name}.md` with frontmatter specifying tools and model:

```yaml
---
name: planner
description: Expert planning specialist...
tools: ["Read", "Grep", "Glob"]
model: opus
---
```

13 agents total: planner, architect, tdd-guide, code-reviewer, security-reviewer, build-error-resolver, e2e-runner, refactor-cleaner, doc-updater, go-reviewer, go-build-resolver, python-reviewer, database-reviewer, chief-of-staff.

### Command Format

Commands live in `commands/{name}.md` with description frontmatter. They are slash-command prompt templates. 33 total including /tdd, /plan, /e2e, /code-review, /build-fix, /learn, /evolve, /multi-execute, /multi-plan, /checkpoint, /sessions, etc.

## Workflow Model

### No Formal Workflow

ECC does NOT have a structured multi-phase workflow like beastmode's design-plan-implement-validate-release. Instead, it provides:

1. **Ad-hoc commands**: User invokes /plan, /tdd, /code-review independently
2. **Suggested sequence** in AGENTS.md: Plan -> TDD -> Review -> Commit
3. **Multi-model orchestration** via /multi-execute: Claude as controller, Codex/Gemini as prototype generators, then audit

The longform guide describes a loose 5-phase pattern:
```
Phase 1: RESEARCH (Explore agent) -> research-summary.md
Phase 2: PLAN (planner agent) -> plan.md
Phase 3: IMPLEMENT (tdd-guide agent) -> code changes
Phase 4: REVIEW (code-reviewer agent) -> review-comments.md
Phase 5: VERIFY (build-error-resolver if needed) -> done or loop back
```

But this is documentation guidance, not enforced structure. No artifacts flow automatically between phases. No state tracking. No checkpoint system.

### Session Persistence (Hooks-Based)

- **SessionStart hook**: Loads previous context from `.claude/sessions/` tmp files
- **SessionEnd hook**: Persists session state and evaluates for patterns
- **PreCompact hook**: Saves state before context window compaction
- **Stop hook**: Checks for console.log, runs cleanup
- **suggest-compact**: Shell script that recommends compaction at logical breakpoints

This is reactive persistence (save what happened) rather than proactive state management (track where a feature is in its lifecycle).

## Key Features

### 1. Continuous Learning v2.1 (Standout Feature)

The "instinct" system is the most sophisticated component:

- **Observation hooks** capture every tool call (PreToolUse/PostToolUse) deterministically
- **Background Haiku agent** analyzes observations for patterns
- **Instincts** are atomic learned behaviors with confidence scoring (0.3-0.9)
- **Project scoping** (v2.1): Instincts isolated per project via git remote hash
- **Evolution**: `/evolve` clusters related instincts into skills/commands/agents
- **Promotion**: Instincts seen in 2+ projects with >=0.8 confidence auto-promote to global
- **Import/Export**: Share instincts across team members

This is genuinely novel. The confidence decay, project scoping, and evolution pipeline are well-designed. However, the background observer has had stability issues (PR #312 fixed three crash bugs in the observer process).

### 2. Multi-Model Orchestration (/multi-execute)

A sophisticated command that:
- Routes frontend tasks to Gemini, backend to Codex
- Claude acts as "Code Sovereign" -- external models return diffs, Claude applies/refactors
- Parallel execution with background tasks
- Multi-model audit (both Codex and Gemini review final code)
- Session reuse across plan and execute phases

This is architecturally interesting but complex. The 10+ page command definition suggests it requires significant context window budget just to load.

### 3. AgentShield Security Scanning

Three-agent adversarial pipeline:
- Attacker agent finds exploits
- Defender agent evaluates protections
- Auditor agent synthesizes findings
- 1282 tests, 102 static analysis rules
- Color-graded A-F output

### 4. Token Optimization Strategy

Practical advice operationalized:
- Default to Sonnet, upgrade to Opus for complex tasks
- Route subagents to Haiku
- Compact at 50% (not default 95%)
- Replace MCP servers with CLI-wrapped skills to save context
- mgrep for ~50% token reduction vs grep

### 5. Cross-Platform Support

- Claude Code (native plugin)
- Cursor (adapter pattern reusing Claude hooks)
- Codex CLI (.codex/config.toml)
- OpenCode (full plugin system, 11 event types)

### 6. Hooks System

9 hook definitions in hooks.json covering:
- Dev server tmux enforcement
- Long-running command tmux reminder
- Git push review reminder
- Doc file warnings
- Suggest-compact at logical intervals
- Continuous learning observation capture
- PR URL logging
- Post-edit auto-format (Biome/Prettier)
- Post-edit TypeScript check
- Console.log warnings
- Session start/end persistence

## Documentation Quality

### Strengths
- **Two companion guides**: Shorthand (setup) + Longform (techniques) -- well-written, practical
- **Worked examples**: Planner agent includes a complete Stripe subscription plan example
- **Real-world CLAUDE.md examples**: 5 examples (generic, SaaS Next.js, Go microservice, Django API, Rust API)
- **CONTRIBUTING.md**: Thorough PR templates for each contribution type
- **Multi-language README**: English, Simplified Chinese, Traditional Chinese, Japanese
- **Token optimization docs**: Dedicated guide in docs/token-optimization.md

### Weaknesses
- **49KB README**: Extremely long, kitchen-sink approach. Hard to find what you need.
- **No progressive loading**: Everything dumped in one layer. No L0/L1/L2 hierarchy.
- **Skill quality varies**: Some skills are 24KB monsters (autonomous-loops), some are templates
- **Stale content**: Some skills reference community projects without verifying current status
- **No API reference**: No structured documentation of what each hook/script actually does

## Community and Traction

### Engagement
- 61K stars in ~7 weeks (created 2026-01-18)
- 30+ contributors with merged PRs
- Active issue tracker (32 open issues)
- Community PRs fixing real bugs (observer crashes, session-end staleness, project detection)
- Chinese translation community (zdocapp)
- X/Twitter presence with visual guides

### Growth Pattern
- Explosive growth driven by social media + Anthropic hackathon credibility
- "25,000+ GitHub stars in under a week" (noted in longform guide)
- Growth appears organic but accelerated by viral X posts

### Contribution Quality
- Recent PRs show real-world bug fixes (observer process management, session staleness)
- Project detection PR adds 12 languages, 25+ frameworks with 28 tests
- Maintainer is responsive, merging PRs within 24-48 hours

## Unique Differentiators vs Beastmode

| Dimension | ECC | Beastmode |
|-----------|-----|-----------|
| **Model** | Component library (pick what you need) | Workflow system (follow the process) |
| **Scope** | Broad (50+ skills, 6 languages) | Deep (5 phases, consistent anatomy) |
| **Workflow** | Suggested but not enforced | Structured and phase-gated |
| **State** | Session-scoped tmp files | Persistent .beastmode/ artifacts |
| **Learning** | Instinct system (hooks + background agent) | Retro sub-phase (classify -> SOPs/overrides/learnings) |
| **Context** | Flat (everything always loaded) | Hierarchical (L0/L1/L2/L3 progressive) |
| **Git** | No special handling | Worktree isolation + squash-per-release |
| **Platform** | Multi-platform (CC, Cursor, Codex, OpenCode) | Claude Code only (plugin) |
| **Audience** | Broad (any developer using AI coding tools) | Narrow (disciplined engineering workflows) |
| **Community** | 61K stars, 30+ contributors | Single author |
| **Distribution** | Plugin + npm + manual copy | Plugin marketplace |
| **Security** | AgentShield adversarial scanning | No dedicated security features |
| **Multi-model** | Codex/Gemini orchestration | Claude-only |

## Weaknesses and Gaps

### 1. No Coherent Workflow
Individual pieces are good but there is no enforced flow. A user can /plan and then never /tdd. Nothing tracks whether the plan was implemented. No validation gate before release. No artifact flow between phases.

### 2. No Project Context Persistence
Session files in .claude/sessions/ are ephemeral tmp files. There is no structured project knowledge base that survives across sessions. Each new session reconstructs context from scratch (unless hooks load the last session file).

### 3. Token Budget Concerns
Loading AGENTS.md (6KB), CLAUDE.md (2.4KB), all rules (~10KB), hooks, and active skills could consume a significant portion of context. The README acknowledges this ("keep under 10 MCPs") but the system itself loads a lot of context by default.

### 4. Skill Quality Inconsistency
Some skills are polished (continuous-learning-v2: 12KB, versioned, with config), others feel like hastily added community contributions. The autonomous-loops skill is 24KB -- larger than many entire phase definitions in beastmode.

### 5. No Self-Improvement Feedback Loop
Despite the instinct system, there is no mechanism for the system to improve its own prompts, skills, or workflows based on experience. Instincts are user-pattern learning, not system self-improvement. The retro concept is absent.

### 6. Fragile Hook Scripts
The hooks.json contains inline Node.js one-liners that are hard to maintain and debug. The observer background process had three crash bugs that went unnoticed until community PR #312. Cross-platform support relies on Node.js scripts that may not handle all edge cases.

### 7. Kitchen-Sink Approach
50+ skills includes things like "investor-materials", "visa-doc-translate", "market-research", "article-writing", "frontend-slides" -- these are not engineering workflow tools. They dilute the core value proposition and increase cognitive load.

### 8. No Design Phase
The workflow starts at /plan. There is no collaborative design phase where gray areas are identified, options are proposed, and decisions are locked before implementation begins. The architect agent reviews designs but does not drive an interactive design process.

## Lessons for Beastmode

### What ECC Does Better
1. **Breadth of pre-built content**: 50+ skills give users instant value. Beastmode requires setup.
2. **Cross-platform**: Cursor/Codex/OpenCode adapters expand addressable audience significantly.
3. **Practical guides**: The longform guide is excellent -- concrete, opinionated, battle-tested advice.
4. **Community contribution model**: Clear CONTRIBUTING.md with templates for each type. Low barrier to entry.
5. **Hook-based automation**: Using Claude Code hooks for real-time enforcement (format, lint, console.log detection) is practical and immediately useful.
6. **Token optimization**: Explicit guidance on model selection, compaction timing, MCP reduction.
7. **Worked examples**: Real CLAUDE.md files for different project types (Next.js, Go, Django, Rust).

### What Beastmode Does Better
1. **Coherent workflow**: Design-plan-implement-validate-release is a real engineering process. ECC is a toolbox.
2. **State persistence**: .beastmode/ artifacts survive sessions with full provenance. ECC has tmp files.
3. **Progressive context**: L0/L1/L2/L3 hierarchy controls token budget. ECC loads everything flat.
4. **Self-improvement**: Retro sub-phase with classified SOPs/overrides/learnings. ECC has no equivalent.
5. **Git discipline**: Worktree isolation, squash-per-release, archive tags. ECC has basic commit conventions.
6. **Design-before-code**: Interactive gray area identification and approval gates. ECC skips straight to planning.
7. **HITL gates**: Two-tier gate system (HARD-GATE + configurable) for safety. ECC has no approval gates.
8. **Consistency**: Every phase follows the same 4-step anatomy. ECC skills have inconsistent structure.

### Ideas Worth Stealing
1. **Instinct confidence scoring**: The 0.3-0.9 scale with decay/growth is more sophisticated than beastmode's "3+ occurrences = promote to SOP" rule. Consider weighted confidence for learnings.
2. **Hook-based observation**: Deterministic capture via PreToolUse/PostToolUse is architecturally sound. More reliable than session-end-only capture.
3. **Project detection via git remote hash**: Portable project identity that works across machines. Useful for cross-session context.
4. **Token optimization as explicit concern**: Beastmode documents progressive loading but does not explicitly address token economics (model selection, compaction strategy, MCP budget).
5. **Worked CLAUDE.md examples**: Real project templates for different stacks would help beastmode adoption.
6. **Multi-language rule sets**: Organizing rules by language (common + TypeScript + Python + Go + Swift) is clean. Beastmode could structure conventions similarly.

## Sources

- GitHub repo: https://github.com/affaan-m/everything-claude-code [HIGH -- direct source]
- README.md (49KB) [HIGH]
- AGENTS.md [HIGH]
- CLAUDE.md [HIGH]
- CONTRIBUTING.md [HIGH]
- the-longform-guide.md [HIGH]
- hooks/hooks.json [HIGH]
- skills/continuous-learning-v2/SKILL.md [HIGH]
- agents/planner.md [HIGH]
- commands/multi-execute.md [HIGH]
- examples/CLAUDE.md [HIGH]
- install.sh [HIGH]
- package.json [HIGH]
- Recent 15 commits on main [HIGH]
- GitHub API repository metadata [HIGH]
