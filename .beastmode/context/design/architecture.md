# ARCHITECTURE - System Architecture

## Purpose

Documents the system design, component relationships, and data flow.

## Overview

Beastmode is a workflow system that turns Claude Code into a disciplined engineering partner through opinionated workflow patterns. It provides a structured five-phase workflow (design → plan → implement → validate → release) with standalone utilities (/beastmode, /status) that scales from quick fixes to deep feature work, enabling Claude agents to systematically design and implement features while maintaining comprehensive project context across sessions through `.beastmode/` artifact storage.

Each workflow phase follows the standard sub-phase anatomy: `0-prime → 1-execute → 2-validate → 3-checkpoint`. This provides consistent structure while allowing phase-specific behavior.

- **0-prime**: Read-only — loads project context (`.beastmode/` L0/L1), meta, and input artifacts (design doc, plan, status file). No side effects, no bash commands, no `cd`.
- **1-execute**: Action phase — worktree entry/creation is always step 1, followed by skill-specific work (exploration, coding, testing, releasing).
- **2-validate**: Quality check — verifies work completeness, user approval gates.
- **3-checkpoint**: Persistence — saves artifacts, captures learnings, suggests next step.

## Knowledge Architecture

### L0/L1/L2 Hierarchy

- **L0**: Top-level files (PRODUCT.md) — Product vision
- **L1**: Phase summaries (UPPERCASE.md) — Always loaded by /prime
- **L2**: Detail files (lowercase/) — Loaded on-demand via @imports

### Four Data Domains

| Domain | Purpose | Location |
|--------|---------|----------|
| **Product** | What we're building | `.beastmode/PRODUCT.md` |
| **State** | Where features are in workflow (kanban) | `.beastmode/state/` |
| **Context** | How to build (architecture, conventions, testing) | `.beastmode/context/` |
| **Meta** | How to improve (learnings, overrides) | `.beastmode/meta/` |

## Components

**Skills (Workflow Verbs):**
- Purpose: Individual commands that execute specific workflow phases
- Location: `/skills/`
- Dependencies: Reference templates, Common instructions, .beastmode/ infrastructure

**Beastmode Skill:**
- Purpose: Project initialization — install .beastmode/ structure, auto-populate context (brownfield), or interactive setup (greenfield)
- Location: `/skills/beastmode/`
- Dependencies: Templates, CLAUDE.md bridge, Explore agents for brownfield discovery

**Design Skill:**
- Purpose: Brainstorm and create design specs through collaborative dialogue with user approval gates
- Location: `/skills/design/`
- Dependencies: Project context, user interaction

**Plan Skill:**
- Purpose: Convert designs into bite-sized implementation tasks with comprehensive documentation
- Location: `/skills/plan/`
- Dependencies: Design docs, project structure, testing infrastructure

**Implement Skill:**
- Purpose: Execute implementation plans in isolated git worktrees with clean merge on completion
- Location: `/skills/implement/`
- Dependencies: Git, npm/package manager, task tracking, test runner

**Validate Skill:**
- Purpose: Quality gate before release — runs tests, lint, type checks, and custom gates
- Location: `/skills/validate/`
- Dependencies: Test runner, linter, type checker (project-specific)

**Status Skill:**
- Purpose: Track current project state and milestones
- Location: `/skills/status/`
- Dependencies: .beastmode/state/ directory

**Release Skill:**
- Purpose: Create changelogs, stage unified cycle changes, commit, merge to main, and cleanup worktree
- Location: `/skills/release/`
- Dependencies: Git, .beastmode/ artifacts, status file with worktree info

**Agents:**
- Purpose: Subagents spawned for specialized tasks (discovery, research)
- Location: `/agents/`
- Contains: discovery.md (codebase analysis), researcher.md (phase research with verification protocol)
- Dependencies: Skill prompts, project codebase

**.beastmode/ Infrastructure:**
- Purpose: Central context storage that persists across sessions
- Location: `/.beastmode/`
- Contains: PRODUCT.md (L0), state/, context/, meta/ (L1/L2)
- Dependencies: None (root structure)

## Data Flow

```
User workflow intent
  ↓
Skill execution (design creates feature branch + worktree)
  ↓
Status file updated with worktree path and feature branch
  ↓
Subsequent phases (plan, implement, validate) inherit worktree from status
  ↓
Each phase: cd into worktree → execute → commit as needed
  ↓
Release: merge feature branch → cleanup worktree + branch
  ↓
.beastmode/ artifacts + code changes persist on main
```

Feature state flows through `.beastmode/state/` directories:
```
state/design/2026-03-03-login-form.md
  → state/plan/2026-03-03-login-form.md
  → state/validate/2026-03-03-login-form.md
  → state/release/2026-03-03-login-form.md
```

For Retro functionality (now in 3-checkpoint sub-phase):
```
3-checkpoint sub-phase triggers learnings capture
  ↓
Update .beastmode/meta/ with session insights
  ↓
Learnings inform future sessions via L1 loading
```

## Key Decisions

**Five-Phase Workflow:**
- Context: Need to support both quick fixes and deep features without overhead
- Decision: Linear workflow (design → plan → implement → validate → release) with standalone utilities (/beastmode, /status)
- Rationale: Matches real engineering practices; design-before-code prevents wasted implementation; validate ensures quality before release; each phase has sub-phases: 0-prime → 1-execute → 2-validate → 3-checkpoint

**L0/L1/L2 Hierarchical Loading:**
- Context: Need to balance comprehensive context with token efficiency
- Decision: Three-level hierarchy — L0 (product vision), L1 (phase summaries always loaded), L2 (details on-demand)
- Rationale: L1 summaries provide enough context for most tasks; L2 details loaded only when needed

**Four Data Domains (Product/State/Context/Meta):**
- Context: Different types of information have different lifecycles and purposes
- Decision: Separate product vision, feature state (kanban), build context, and self-improvement into distinct domains
- Rationale: Clear separation enables focused updates; state as kanban maps to feature workflow; meta enables continuous improvement

**Artifact-Based Context Persistence:**
- Context: Multi-session work requires context to survive between Claude Code sessions
- Decision: Store all phase outputs in .beastmode/ as markdown files that are version-controlled
- Rationale: Git provides durability and history; markdown is human-readable; .beastmode/ is always loaded by /prime skill

**Skill Interfaces via SKILL.md:**
- Context: Need clear definition of what each phase reads, writes, and does
- Decision: Each skill's SKILL.md defines its interface (phases, inputs, outputs) colocated with implementation
- Rationale: Interface and implementation live together; SKILL.md serves as both docs and manifest

**Parallel Discovery Agents:**
- Context: Initial codebase analysis is expensive; want comprehensive findings without sequential wait time
- Decision: `/beastmode init --brownfield` spawns parallel Explore agents to auto-populate context files
- Rationale: Parallel execution saves session time; agents merge findings with existing content

**Isolated Implementation Worktrees:**
- Context: Implement skill needs to execute complex plans without disrupting main branch or other agents
- Decision: Create isolated git worktrees in .beastmode/worktrees/ for execution, merge back on completion
- Rationale: Git worktrees provide branch isolation; enables concurrent work; clean merge on success

**Unified Cycle Commit Architecture:**
- Context: Multiple phase-specific commits per feature cycle create noise; worktree isolation enables consolidation
- Decision: Design creates worktree, all phases write artifacts without committing, Release owns single commit + merge + cleanup
- Rationale: Reduces commit noise; maintains WIP safety via worktree isolation; clear endpoint for merge/cleanup logic; single commit simplifies history

**CLAUDE.md Imports from .beastmode/:**
- Context: Need minimal project brain in root while keeping comprehensive docs organized
- Decision: Root CLAUDE.md imports @.beastmode/PRODUCT.md and @.beastmode/context/*.md
- Rationale: Clear precedent for project context; @imports reduce duplication; context files loaded hierarchically

## Boundaries

**External APIs:**
- Claude Code / Claude Agent SDK: Provides skill execution environment and subagent spawning
- Git: Version control and worktree isolation for implementation
- NPM / Package managers: Dependency installation and task running

**Internal Boundaries:**
- Skill boundary: Each verb (design, plan, implement, validate, release) is isolated in `/skills/{verb}/`
- Agent boundary: Subagents are spawned for specific tasks and exit after completion
- Context boundary: .beastmode/ folder is the single source of truth for project context across sessions
- Domain boundary: Product, State, Context, Meta are separate concerns with distinct update patterns
- Phase boundary: Each workflow phase produces artifacts consumed by the next phase (design → plan → implement → validate → release)

**Public Interfaces:**
- Skill commands (e.g., `/design`, `/plan`, `/implement`, `/validate`, `/release`)
- SKILL.md manifests — phase interface definitions colocated with skills
- .beastmode/ folder structure (user-facing artifact storage)
- @import syntax for CLAUDE.md (documentation composition)
- Root CLAUDE.md (entry point for project brain)
