# ARCHITECTURE - System Architecture

## Purpose

Documents the system design, component relationships, and data flow.

## Overview

Beastmode is a workflow system that turns Claude Code into a disciplined engineering partner through opinionated workflow patterns. It provides a structured seven-phase workflow (prime → research → design → plan → implement → verify → retro) that scales from quick fixes to deep feature work, enabling Claude agents to systematically explore, design, and implement features while maintaining comprehensive project context across sessions through .agent/ artifact storage.

## Components

**Skills (Workflow Verbs):**
- Purpose: Individual commands that execute specific workflow phases
- Location: `/skills/`
- Dependencies: Reference templates, Common instructions, .agent/ infrastructure

**Bootstrap Skill:**
- Purpose: Initialize a new project with .agent/ folder structure and prime/ reference templates
- Location: `/skills/bootstrap/`
- Dependencies: Templates in `/skills/bootstrap/templates/`, CLAUDE.md bridge

**Prime Skill:**
- Purpose: Load comprehensive codebase understanding by analyzing structure, documentation, and key files
- Location: `/skills/prime/`
- Dependencies: Project files, documentation, code

**Bootstrap Discovery Skill:**
- Purpose: Autonomous parallel codebase analysis with 5 parallel Explore agents to auto-populate .agent/prime/*.md files
- Location: `/skills/bootstrap-discovery/`
- Dependencies: Five agent prompt templates (STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING agents), common instructions, .agent/prime/ directory

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
- Dependencies: .agent/status/ directory

**Verify Skill:**
- Purpose: Run verification and create test reports
- Location: `/skills/verify/`
- Dependencies: Test infrastructure, .agent/verify/ directory

**Release Skill:**
- Purpose: Create changelogs and release notes
- Location: `/skills/release/`
- Dependencies: Git history, .agent/release/ directory

**Retro Skill:**
- Purpose: Analyze session work to improve agent instructions through Review & Remember phase
- Location: `/skills/retro/`
- Dependencies: Session artifacts, .agent/CLAUDE.md, agent instruction files

**Agents:**
- Purpose: Subagents spawned for parallel discovery and analysis (Discovery agent for codebase analysis)
- Location: `/agents/`
- Dependencies: Skill prompts, project codebase

**.agent/ Infrastructure:**
- Purpose: Central context storage that persists across sessions
- Location: `/.agent/`
- Dependencies: None (root structure)

## Data Flow

```
User workflow intent
  ↓
Skill execution
  ↓
Phase-specific processing (analysis, dialogue, planning, execution)
  ↓
.agent/ artifact storage (research/, design/, plan/, status/, verify/, release/)
  ↓
Next session loads .agent/CLAUDE.md + prime/
  ↓
Resume from checkpoint or build on previous work
```

For Bootstrap Discovery specifically:
```
.agent/prime/ current state
  ↓
Assemble 5 agent prompts (concatenate: agent-specific + common instructions + current content)
  ↓
Spawn 5 Explore agents in parallel (haiku model)
  ↓
Collect markdown responses from all agents
  ↓
Write updated markdown to .agent/prime/{STACK,STRUCTURE,CONVENTIONS,ARCHITECTURE,TESTING}.md
  ↓
Update CLAUDE.md Rules Summary
  ↓
Offer commit to git
```

## Key Decisions

**Seven-Phase Workflow:**
- Context: Need to support both quick fixes and deep features without overhead
- Decision: Linear workflow (prime → research → design → plan → implement → verify → retro) where each phase is optional
- Rationale: Matches real engineering practices; research-before-design prevents wasted implementation; retro captures learnings for continuous improvement

**Artifact-Based Context Persistence:**
- Context: Multi-session work requires context to survive between Claude Code sessions
- Decision: Store all phase outputs in .agent/ as markdown files that are version-controlled
- Rationale: Git provides durability and history; markdown is human-readable; .agent/prime/ is always loaded by /prime skill

**.agent/prime/ Directory with Meta Governance:**
- Context: Need consistent documentation structure across all projects
- Decision: Invariant files (META.md, AGENTS.md) define how prime/ files are maintained; template files guide users
- Rationale: META.md ensures Rules Summary is kept in sync with prime/ files; prevents documentation drift

**Parallel Discovery Agents:**
- Context: Initial codebase analysis is expensive; want comprehensive findings without sequential wait time
- Decision: bootstrap-discovery spawns 5 independent Explore agents in parallel (one per prime target: STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING)
- Rationale: Haiku model is fast enough; parallel execution saves session time; agents merge findings with existing content

**Isolated Implementation Worktrees:**
- Context: Implement skill needs to execute complex plans without disrupting main branch or other agents
- Decision: Create isolated git worktrees in .agent/worktrees/ for execution, merge back on completion
- Rationale: Git worktrees provide branch isolation; enables concurrent work; clean merge on success

**CLAUDE.md Bridge + .agent/CLAUDE.md:**
- Context: Need minimal project brain in root while keeping comprehensive docs in .agent/
- Decision: Root CLAUDE.md imports @.agent/CLAUDE.md which imports @.agent/prime/META.md
- Rationale: Clear precedent for project context; <200 lines rule keeps root simple; @imports reduce duplication

## Boundaries

**External APIs:**
- Claude Code / Claude Agent SDK: Provides skill execution environment and subagent spawning
- Git: Version control and worktree isolation for implementation
- NPM / Package managers: Dependency installation and task running

**Internal Boundaries:**
- Skill boundary: Each verb (prime, design, plan, implement, retro) is isolated in `/skills/{verb}/`
- Agent boundary: Subagents are spawned for specific tasks and exit after completion
- Context boundary: .agent/ folder is the single source of truth for project context across sessions
- Prime boundary: .agent/prime/*.md files form the read-only reference material loaded every session
- Phase boundary: Each workflow phase produces artifacts consumed by the next phase (design → plan → implement)

**Public Interfaces:**
- Skill commands (e.g., `/prime`, `/design`, `/plan`, `/implement`)
- .agent/ folder structure (user-facing artifact storage)
- @import syntax for CLAUDE.md (documentation composition)
- Root CLAUDE.md (entry point for project brain)
