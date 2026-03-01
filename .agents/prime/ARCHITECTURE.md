# ARCHITECTURE - System Architecture

## Purpose

Documents the system design, component relationships, and data flow.

## Overview

Beastmode is a workflow system that turns Claude Code into a disciplined engineering partner through opinionated workflow patterns. It provides a structured six-phase workflow (prime → design → plan → implement → release → retro) with standalone utilities (/bootstrap, /research, /status) that scales from quick fixes to deep feature work, enabling Claude agents to systematically design and implement features while maintaining comprehensive project context across sessions through .agents/ artifact storage.

## Components

**Skills (Workflow Verbs):**
- Purpose: Individual commands that execute specific workflow phases
- Location: `/skills/`
- Dependencies: Reference templates, Common instructions, .agents/ infrastructure

**Bootstrap Skill:**
- Purpose: Initialize a new project with .agents/ folder structure and prime/ reference templates
- Location: `/skills/bootstrap/`
- Dependencies: Templates in `/skills/bootstrap/templates/`, CLAUDE.md bridge

**Prime Skill:**
- Purpose: Load curated beastmode context for fast session initialization; reads all `.agents/prime/` and situational files with silent output
- Location: `/skills/prime/`
- Dependencies: Bootstrapped beastmode project (.agents/prime/ directory), .agents/CLAUDE.md, project context

**Bootstrap Discovery Skill:**
- Purpose: Autonomous parallel codebase analysis with 5 parallel Explore agents to auto-populate .agents/prime/*.md files
- Location: `/skills/bootstrap-discovery/`
- Dependencies: Five agent prompt templates (STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING agents), common instructions, .agents/prime/ directory

**Research Skill:**
- Purpose: Conduct domain exploration and discovery
- Location: `/skills/research/`
- Dependencies: Project context

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

**Status Skill:**
- Purpose: Track current project state and milestones
- Location: `/skills/status/`
- Dependencies: .agents/status/ directory

**Release Skill:**
- Purpose: Create changelogs, stage unified cycle changes, commit, merge to main, and cleanup worktree
- Location: `/skills/release/`
- Dependencies: Git, .agents/ artifacts, plan/implement/retro outputs, status file with worktree info

**Retro Skill:**
- Purpose: Analyze session work to improve agent instructions through parallel prime file review
- Location: `/skills/retro/`
- Dependencies: Session artifacts (.agents/status/ markdown + session JSONL files), .agents/CLAUDE.md, agent instruction files, design/plan docs for architectural decisions

**Agents:**
- Purpose: Subagents spawned for parallel discovery and analysis (Discovery agent for codebase analysis)
- Location: `/agents/`
- Dependencies: Skill prompts, project codebase

**.agents/ Infrastructure:**
- Purpose: Central context storage that persists across sessions
- Location: `/.agents/`
- Dependencies: None (root structure)

## Data Flow

```
User workflow intent
  ↓
Skill execution (design creates cycle worktree)
  ↓
Status file updated with worktree path
  ↓
Subsequent phases (plan, implement, retro) inherit worktree from status
  ↓
Each phase: cd into worktree → execute → write artifacts (NO commit)
  ↓
Release: stage all → single commit → merge → cleanup worktree
  ↓
.agents/ artifacts + code changes persist on main
```

For Bootstrap Discovery specifically:
```
.agents/prime/ current state
  ↓
Assemble 5 agent prompts (concatenate: agent-specific + common instructions + current content)
  ↓
Spawn 5 Explore agents in parallel (haiku model)
  ↓
Collect markdown responses from all agents
  ↓
Write updated markdown to .agents/prime/{STACK,STRUCTURE,CONVENTIONS,ARCHITECTURE,TESTING}.md
  ↓
Update CLAUDE.md Rules Summary
  ↓
Offer commit to git
```

For Retro specifically:
```
.agents/status/ (with Session Files section)
  ↓
Gather phase collects session JSONL paths
  ↓
Review agents receive paths in prompts
  ↓
Agents read JSONL conversations for context
  ↓
Findings include conversation-informed recommendations
  ↓
Apply phase updates .agents/prime/
```

## Key Decisions

**Six-Phase Workflow:**
- Context: Need to support both quick fixes and deep features without overhead
- Decision: Linear workflow (prime → design → plan → implement → release → retro) with standalone utilities (/bootstrap, /research, /status)
- Rationale: Matches real engineering practices; design-before-code prevents wasted implementation; retro captures learnings for continuous improvement

**Artifact-Based Context Persistence:**
- Context: Multi-session work requires context to survive between Claude Code sessions
- Decision: Store all phase outputs in .agents/ as markdown files that are version-controlled
- Rationale: Git provides durability and history; markdown is human-readable; .agents/prime/ is always loaded by /prime skill

**.agents/prime/ Directory with Meta Governance:**
- Context: Need consistent documentation structure across all projects
- Decision: Invariant files (META.md, AGENTS.md) define how prime/ files are maintained; template files guide users
- Rationale: META.md ensures Rules Summary is kept in sync with prime/ files; prevents documentation drift

**Parallel Discovery Agents:**
- Context: Initial codebase analysis is expensive; want comprehensive findings without sequential wait time
- Decision: bootstrap-discovery spawns 5 independent Explore agents in parallel (one per prime target: STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING)
- Rationale: Haiku model is fast enough; parallel execution saves session time; agents merge findings with existing content

**Isolated Implementation Worktrees:**
- Context: Implement skill needs to execute complex plans without disrupting main branch or other agents
- Decision: Create isolated git worktrees in .agents/worktrees/ for execution, merge back on completion
- Rationale: Git worktrees provide branch isolation; enables concurrent work; clean merge on success

**Unified Cycle Commit Architecture:**
- Context: Five phase-specific commits per feature cycle create noise; worktree isolation enables consolidation
- Decision: Design creates worktree, all phases write artifacts without committing, Release owns single commit + merge + cleanup
- Rationale: Reduces commit noise; maintains WIP safety via worktree isolation; clear endpoint for merge/cleanup logic; single commit simplifies history

**CLAUDE.md Bridge + .agents/CLAUDE.md:**
- Context: Need minimal project brain in root while keeping comprehensive docs in .agents/
- Decision: Root CLAUDE.md imports @.agents/CLAUDE.md which imports @.agents/prime/META.md
- Rationale: Clear precedent for project context; <200 lines rule keeps root simple; @imports reduce duplication

**Session JSONL Access for Retro Inspection:**
- Context: Retro agents need access to actual conversation history, not just markdown summaries
- Decision: Store absolute paths to session JSONL files in status markdown under "Session Files" section; agents read files directly
- Rationale: Raw conversation context enables agents to identify patterns and provide informed recommendations; machine-readable section enables simple path collection

**Design-Documentation Alignment via Retro:**
- Context: Design docs establish architectural decisions that may not make it to prime documentation
- Decision: Retro review agents check each design doc against corresponding prime files to verify patterns are captured
- Rationale: Ensures design decisions don't get lost; creates feedback loop where design informs documentation

## Boundaries

**External APIs:**
- Claude Code / Claude Agent SDK: Provides skill execution environment and subagent spawning
- Git: Version control and worktree isolation for implementation
- NPM / Package managers: Dependency installation and task running

**Internal Boundaries:**
- Skill boundary: Each verb (prime, design, plan, implement, retro) is isolated in `/skills/{verb}/`
- Agent boundary: Subagents are spawned for specific tasks and exit after completion
- Context boundary: .agents/ folder is the single source of truth for project context across sessions
- Prime boundary: .agents/prime/*.md files form the read-only reference material loaded every session
- Phase boundary: Each workflow phase produces artifacts consumed by the next phase (design → plan → implement)

**Public Interfaces:**
- Skill commands (e.g., `/prime`, `/design`, `/plan`, `/implement`)
- .agents/ folder structure (user-facing artifact storage)
- @import syntax for CLAUDE.md (documentation composition)
- Root CLAUDE.md (entry point for project brain)
