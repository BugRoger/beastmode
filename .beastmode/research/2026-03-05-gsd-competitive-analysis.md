# Research: GSD (Get Shit Done) Competitive Analysis

**Date:** 2026-03-05
**Phase:** design
**Objective:** Comprehensive analysis of gsd-build/get-shit-done as a competitive system in the Claude Code workflow tooling space.

## Summary

GSD is a 24.8K-star, npm-distributed workflow system for Claude Code (and OpenCode, Gemini CLI, Codex) that solves "context rot" -- quality degradation as context windows fill. Its core innovation is aggressive subagent isolation: every plan executes in a fresh 200K context window while the orchestrator stays lean at ~10-15% usage. The system is heavily optimized for solo developers and "vibecoding" use cases, with a strongly opinionated anti-enterprise positioning.

## 1. What It Is

**Core Value Proposition:** Context engineering layer that makes Claude Code reliable for building complete applications. Solves context rot by keeping orchestrators lean and spawning fresh subagents for heavy work.

**Target Audience:** Solo developers and creative builders who use AI to generate code. Explicitly anti-enterprise: "No sprint ceremonies, story points, stakeholder syncs, retrospectives, Jira workflows."

**Distribution:** npm package (`npx get-shit-done-cc@latest`), installs as Claude Code custom commands (`.claude/commands/gsd/*.md`). Also supports OpenCode, Gemini CLI, and Codex runtimes. Version 1.22.4.

**Author:** TACHES (Lex Christopherson / @glittercowboy). Organization: gsd-build.

## 2. Architecture

### Directory Structure

```
get-shit-done/
  commands/gsd/          # 32 thin command stubs (YAML frontmatter + @-reference to workflow)
  get-shit-done/         # Core logic
    workflows/           # 35 detailed workflow definitions (the real implementation)
    references/          # Shared reference docs (checkpoints, git integration, model profiles, etc.)
    templates/           # Output templates (project, roadmap, requirements, state, summary, etc.)
    bin/                 # gsd-tools.cjs -- CLI tooling for state management, commits, config
      lib/               # Library modules (core, state, phase, config, commands, etc.)
  agents/                # 12 specialized agent definitions with YAML frontmatter
  hooks/                 # 3 JS hooks (context monitor, statusline, update checker)
  bin/                   # install.js (88KB -- full installer with multi-runtime support)
  tests/                 # 15 test files covering commands, config, state, phases, etc.
  scripts/               # Build scripts (hooks bundling, test runner)
```

### Two-Layer Command Architecture

**Commands** (`commands/gsd/*.md`) are thin stubs: YAML frontmatter (name, description, allowed-tools) + XML structure pointing to the real workflow via `@~/.claude/get-shit-done/workflows/*.md`. The command is the entry point; the workflow is the implementation.

Example command (`execute-phase.md`, ~1.3KB):
```xml
<execution_context>
@~/.claude/get-shit-done/workflows/execute-phase.md
</execution_context>
<process>
Execute the execute-phase workflow end-to-end.
</process>
```

**Workflows** (`get-shit-done/workflows/*.md`) are the real logic: 5-20KB each, with detailed step-by-step XML-structured instructions, bash code blocks, failure handling, and state management. These are substantial prompt engineering documents.

### Agent System

12 specialized agents with YAML frontmatter defining name, description, tools, color, and skills:

| Agent | Size | Purpose |
|-------|------|---------|
| gsd-planner | 43KB | Creates execution plans with XML task structure |
| gsd-executor | 19KB | Executes plans with atomic commits, deviation handling |
| gsd-debugger | 38KB | Systematic debugging with persistent state |
| gsd-plan-checker | 23KB | Verifies plans achieve phase goals (up to 3 iterations) |
| gsd-verifier | 19KB | Checks codebase against phase goals post-execution |
| gsd-phase-researcher | 18KB | Investigates domain for phase planning |
| gsd-project-researcher | 16KB | Investigates domain for project initialization |
| gsd-codebase-mapper | 17KB | Analyzes existing codebases (brownfield) |
| gsd-roadmapper | 17KB | Creates phased roadmaps from requirements |
| gsd-research-synthesizer | 7KB | Combines parallel research findings |
| gsd-integration-checker | 13KB | Cross-plan integration verification |
| gsd-nyquist-auditor | 5KB | Retroactive test coverage validation |

Total agent prompt weight: ~245KB. These are large, detailed meta-prompts.

### Tooling Layer

`gsd-tools.cjs` (23KB) is a CLI tool that agents invoke via bash for:
- State management (advance plan, update progress, record metrics)
- Config read/write (config-get, config-set, config-ensure)
- Phase operations (find phase, plan index, complete phase)
- Roadmap updates (update-plan-progress, mark requirements complete)
- Git integration (commit with commit_docs/gitignore checks)
- Init commands (load all context for a workflow step in one JSON blob)

This is actual JavaScript code -- not prompt engineering. It handles the deterministic state management that prompt-only approaches cannot reliably do.

### Hooks

3 JavaScript hooks that run as Claude Code PostToolUse hooks:
- **gsd-context-monitor.js** (5.5KB): Monitors context window usage, injects warnings at 35% (warning) and 25% (critical) remaining. Uses temp files for inter-hook state. This is GSD's core context rot defense.
- **gsd-statusline.js** (4.5KB): Shows context usage, phase progress, and todo count in the statusline.
- **gsd-check-update.js** (2.8KB): Checks for npm updates, shows changelog diff.

## 3. Workflow Model

### Phase Lifecycle

```
new-project -> [discuss-phase -> plan-phase -> execute-phase -> verify-work] x N -> complete-milestone
```

Six distinct steps per phase (GSD calls these "commands", not "phases"):

1. **Discuss** (`discuss-phase`): Interactive gray area identification. Identifies what needs clarification based on domain (visual features = layout/density, APIs = response format/errors, etc.). User selects which areas to discuss, 4 questions per area. Output: `CONTEXT.md`.

2. **Research** (embedded in `plan-phase`): 4 parallel researcher agents investigate stack, features, architecture, pitfalls. Output: `RESEARCH.md`. Can be skipped with `--skip-research`.

3. **Plan** (`plan-phase`): Planner agent creates 2-3 atomic plans per phase with XML task structure. Plan checker verifies (up to 3 iterations). Output: `XX-YY-PLAN.md` files.

4. **Execute** (`execute-phase`): Wave-based parallel execution. Plans grouped by dependencies into waves. Each plan gets a fresh executor subagent with full 200K context. Atomic commits per task. Output: `SUMMARY.md` files.

5. **Verify** (`verify-work`): Manual user acceptance testing. Extracts testable deliverables, walks user through them one by one. Spawns debug agents for failures. Creates fix plans for re-execution.

6. **Complete** (`complete-milestone`): Archives milestone, tags release, offers branch merge.

### Key Workflow Features

- **Wave-based parallelization**: Plans are dependency-analyzed and grouped into waves. Independent plans run in parallel; dependent plans wait.
- **Fresh context per subagent**: Each executor gets clean 200K context. Orchestrator stays at ~10-15%.
- **Checkpoint protocol**: Non-autonomous tasks pause execution, return structured state, and a fresh continuation agent picks up (not resume -- fresh agent with explicit state).
- **Deviation rules**: 4-tier automatic deviation handling during execution (auto-fix bugs, auto-add missing critical functionality, auto-fix blocking issues, ask about architectural changes).
- **Gap closure cycle**: verify -> plan-phase --gaps -> execute-phase --gaps-only -> verify again.

## 4. Key Features

### Context Engineering
- **Context monitor hook**: Real-time context window monitoring with warning/critical thresholds
- **Fresh 200K per executor**: The core innovation -- subagents never inherit accumulated context
- **Size-limited artifacts**: Templates enforce size limits on planning documents
- **STATE.md as session memory**: Cross-session persistence without vector DBs

### Configuration System
- **config.json**: Mode (interactive/yolo), granularity (coarse/standard/fine), model profiles, workflow toggles, git branching strategy, parallelization settings, safety gates
- **Model profiles**: 3 presets (quality/balanced/budget) controlling which Claude model each of the 11 agents uses (Opus/Sonnet/Haiku)
- **Workflow toggles**: Research, plan-check, verifier, auto-advance can all be toggled on/off
- **Git branching**: None/phase/milestone strategies with configurable branch templates

### Unique Capabilities
- **`/gsd:quick`**: Fast path for ad-hoc tasks (bug fixes, small features) with same GSD guarantees
- **`/gsd:map-codebase`**: Brownfield discovery with 4 parallel mapper agents (stack, architecture, conventions, concerns)
- **`/gsd:debug`**: Persistent debugging with state tracking across sessions
- **`/gsd:verify-work`**: Structured UAT with auto-diagnosis and fix plan generation
- **Nyquist validation**: Maps test coverage to requirements before execution, ensuring feedback mechanisms exist
- **Multi-runtime**: Supports Claude Code, OpenCode, Gemini CLI, and Codex
- **Auto-advance chains**: `--auto` flag chains discuss -> plan -> execute without stopping

### XML Task Structure
Plans use structured XML for precise task definition:
```xml
<task type="auto">
  <name>Create login endpoint</name>
  <files>src/app/api/auth/login/route.ts</files>
  <action>Use jose for JWT. Validate credentials. Return httpOnly cookie.</action>
  <verify>curl -X POST localhost:3000/api/auth/login returns 200</verify>
  <done>Valid credentials return cookie, invalid return 401</done>
</task>
```

## 5. Documentation Quality

**Excellent.** One of GSD's genuine strengths.

- **README** (26KB): Well-written, opinionated, with clear workflow explanation, wave execution diagrams, and testimonials. Good visual hierarchy with ASCII art and tables.
- **User Guide** (22KB): Comprehensive reference with workflow diagrams, command reference, full config schema, usage examples, troubleshooting, and recovery guide.
- **CHANGELOG** (70KB): Thorough version history from v1.0.0 through v1.22.4.
- **Agent docs** (245KB total): Each agent is a detailed meta-prompt with execution flow, deviation rules, checkpoint protocols, and failure handling.
- **Context monitor docs** (3KB): Explains the context monitoring system.
- **SECURITY.md**: Responsible disclosure policy.

The documentation clearly targets the solo developer audience and avoids jargon. The workflow diagrams are particularly well-done.

## 6. Community and Traction

| Metric | Value |
|--------|-------|
| Stars | 24,822 |
| Forks | 2,119 |
| Open Issues | 258 |
| License | MIT |
| Created | 2025-12-14 |
| Last Push | 2026-03-03 |
| npm Package | get-shit-done-cc |
| Version | 1.22.4 |
| Topics | claude-code, context-engineering, meta-prompting, spec-driven-development |
| Organization | gsd-build (previously glittercowboy) |
| Discord | Active community |

**Activity Level:** Extremely active. 30+ commits in the last few days before 2026-03-03. Multiple contributors (glittercowboy, Tibsfox, Bantuson). Most commits are co-authored with "Claude Opus 4.6" -- the project eats its own dog food.

**Community Contributions:** Active PR flow with well-structured commit messages. Community-contributed features include Nyquist validation, context monitor improvements, and cross-platform fixes.

**Monetization Signals:** Has a $GSD Solana token (Dexscreener link in README). FUNDING.yml exists. This is unusual for a dev tool and may alienate some potential users.

## 7. Unique Differentiators vs Beastmode

### What GSD Does That Beastmode Doesn't

1. **npm distribution with installer**: `npx get-shit-done-cc@latest` -- one-command install with runtime detection, global/local choice, multi-runtime support. Beastmode uses Claude Code marketplace plugin.

2. **Context window monitoring**: Real-time hooks that inject context usage warnings into the agent conversation. Beastmode has no context rot defense.

3. **Model profile system**: Per-agent model selection (Opus/Sonnet/Haiku) across 11 agents with 3 presets. Beastmode doesn't control subagent model selection.

4. **Discuss phase (gray area identification)**: Structured pre-planning dialogue that identifies ambiguous areas based on the type of work (visual, API, CLI, content, organizational). Domain-aware questioning. Beastmode's /design is interactive but less structured in gray area identification.

5. **Wave-based parallel execution with dependency analysis**: Plans are grouped into dependency waves with automatic parallelization. Independent plans run simultaneously. Beastmode has parallel wave execution but the dependency analysis in GSD is more sophisticated (it analyzes file modifications for overlap).

6. **Structured UAT (verify-work)**: Walks user through testable deliverables one by one, spawns debug agents for failures, creates fix plans. Beastmode's /validate runs project checks but doesn't do structured user acceptance testing.

7. **Quick mode**: Fast path for ad-hoc tasks without full planning overhead. Beastmode has no equivalent.

8. **Multi-runtime support**: Claude Code, OpenCode, Gemini CLI, Codex. Beastmode is Claude Code only.

9. **JavaScript tooling layer**: gsd-tools.cjs handles deterministic operations (state management, config, phase tracking) in actual code rather than prompt instructions. Beastmode relies entirely on prompt-driven operations.

10. **Nyquist validation**: Maps test coverage to requirements before execution, ensuring automated feedback loops exist for every requirement.

### What Beastmode Does That GSD Doesn't

1. **Self-improving retro loop**: Phase checkpoints capture learnings that improve future sessions. Meta domain with SOPs, overrides, and learnings. Auto-promotion of recurring learnings to SOPs. GSD has no learning/improvement mechanism.

2. **Progressive knowledge hierarchy**: L0/L1/L2/L3 fractal loading with curated summaries at each level. GSD loads PROJECT.md + STATE.md but lacks hierarchical context management.

3. **Git worktree isolation**: Feature work happens in isolated worktrees created at design time. GSD has optional branching (none/phase/milestone) but no worktree isolation.

4. **Squash-per-release commit architecture**: One commit per version on main via git merge --squash. Archive tags preserve branch history. GSD uses per-task atomic commits (more granular but noisier on main).

5. **Four data domains (Product/State/Context/Meta)**: Clean separation of concerns with different update patterns. GSD has a flatter `.planning/` structure.

6. **HITL gate configuration**: Two-tier system (HARD-GATE + configurable gates) with per-gate human/auto modes. GSD has mode (interactive/yolo) but it's all-or-nothing.

7. **Persona system**: Deadpan minimalist character with context-aware greetings. GSD has no persona.

8. **Claude Code marketplace distribution**: Plugin system with skill definitions. GSD uses custom commands.

## 8. Weaknesses and Gaps

### Architectural Concerns

1. **Massive prompt sizes**: Agent prompts total ~245KB. The executor alone is 19KB. These are loaded into subagent context windows, consuming meaningful capacity before any work begins. The system solves context rot but introduces context cost.

2. **No learning mechanism**: GSD has zero self-improvement capability. Every session starts from the same prompts. Beastmode's meta layer (SOPs, overrides, learnings) is a genuine differentiator here.

3. **Flat knowledge hierarchy**: Everything lives in `.planning/` with a simple file naming convention. No progressive loading, no summarization hierarchy. As projects grow, the context cost of loading all planning artifacts will grow linearly.

4. **Crypto token in README**: The $GSD Solana token link in the README is a red flag for enterprise adoption and damages credibility with professional developers. It signals prioritization of hype over craft.

5. **Single maintainer risk**: Despite community contributions, the project is heavily dependent on one person (glittercowboy/TACHES). The org was renamed from `glittercowboy` to `gsd-build` recently.

6. **No worktree isolation**: Feature branches are optional and don't use git worktrees. This means execution can interfere with the working directory.

### Implementation Concerns

7. **88KB installer**: The `bin/install.js` is a single 88KB JavaScript file. This is a maintenance risk and suggests the codebase grew organically.

8. **gsd-tools.cjs complexity**: The CLI tooling layer is powerful but introduces a JavaScript dependency into what is otherwise a markdown/prompt system. Breaking changes in gsd-tools.cjs cascade to all workflows.

9. **Checkpoint continuation via fresh agents**: When a checkpoint is hit, a fresh agent is spawned with explicit state rather than resuming. This is a workaround for Claude Code serialization bugs, but it means context is reconstructed from scratch, which may miss nuances from the original execution.

10. **No CLAUDE.md integration**: GSD installs to `.claude/commands/` and doesn't use or generate CLAUDE.md. This means project conventions defined in CLAUDE.md may not be respected by GSD workflows. The executor agent does read CLAUDE.md if it exists, but the rest of the system doesn't.

### Workflow Concerns

11. **Phase-centric, not feature-centric**: GSD organizes work by phases within a milestone, not by features. This works for greenfield projects but gets awkward when multiple features are in flight simultaneously.

12. **No design phase for architecture**: GSD jumps from "discuss" (gray area identification) to "plan" (task creation). There's no equivalent to beastmode's /design where architectural decisions are made, explored, and locked. The discuss phase captures preferences, not architecture.

13. **Aggressive "skip permissions" recommendation**: The README prominently recommends `--dangerously-skip-permissions`. While practical, this normalizes running untrusted code without review.

## 9. Size Comparison

| Dimension | GSD | Beastmode |
|-----------|-----|-----------|
| Stars | 24,822 | -- (marketplace plugin) |
| Total Files | ~100 | ~90 |
| Agent prompt weight | ~245KB | ~30KB |
| Workflow weight | ~280KB | ~60KB |
| JavaScript tooling | ~120KB (gsd-tools + installer) | 0 (pure markdown) |
| Test files | 15 files, ~340KB | Manual verification |
| Commands/Skills | 32 commands | 7 skills |
| Specialized agents | 12 | 4 |
| Phases per feature | 6 (discuss/research/plan/execute/verify/complete) | 5 (design/plan/implement/validate/release) |
| npm version | 1.22.4 | 0.12.0 |

## 10. Lessons for Beastmode

### Ideas Worth Considering

1. **Context monitoring**: GSD's hook-based context usage tracking is genuinely useful and not something beastmode has. Could be implemented as a session-start hook or PostToolUse hook.

2. **Quick mode**: A fast path for ad-hoc tasks that bypasses the full workflow but maintains quality guarantees is a common user need.

3. **Discuss phase depth**: GSD's domain-aware gray area identification (visual features = layout/density, APIs = response format, etc.) is more structured than beastmode's current design skill.

4. **JavaScript tooling for deterministic operations**: State management, config handling, and phase tracking are notoriously unreliable when done purely through prompts. GSD's gsd-tools.cjs handles these deterministically.

5. **Model profile system**: Controlling which model each subagent uses enables cost/quality tradeoffs that are currently invisible in beastmode.

### Ideas to Avoid

1. **Massive agent prompts**: 245KB of agent prompts is a tax on every subagent spawn. Keep agent definitions lean.

2. **Flat planning structure**: GSD's `.planning/` directory will struggle at scale. Beastmode's hierarchical approach is architecturally superior.

3. **No learning mechanism**: GSD proves that you can get to 25K stars without self-improvement. But it's a gap that will matter for power users.

4. **Crypto token integration**: Just don't.

## Sources

- GitHub repository: `gsd-build/get-shit-done` (2eaed7a8475839958f9ec76ca4c26d9a0bbfc33f) -- all file contents read directly via GitHub API [HIGH]
- Repository metadata via GitHub search API [HIGH]
- Commit history (30 most recent commits) via GitHub API [HIGH]
