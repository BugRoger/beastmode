# Design: Enhanced Retro Skill with Prime Review

**Date**: 2026-03-01
**Status**: Approved
**Author**: Michi + Claude

## Summary

Extend the `/retro` skill with a comprehensive workflow cycle retrospective that reviews all prime files and CLAUDE.md in parallel, surfacing improvements based on design docs, plan docs, and session artifacts.

## Problem

The current retro skill focuses on session-level findings but doesn't systematically review whether workflow documentation (prime files) is still accurate after a cycle of work. Over time, prime files drift from reality as new patterns emerge and conventions evolve.

## Solution

Add a parallel prime review phase that:
1. Spawns 8 subagents (7 prime files + CLAUDE.md) to analyze cycle artifacts
2. Each agent diffs against existing documentation and only surfaces findings that warrant changes
3. Synthesizes findings for user approval before applying

## Architecture

### New File Structure

```
skills/retro/
├── SKILL.md                     # Updated main skill
├── references/
│   ├── retro.md                 # Main flow + prime review orchestration
│   └── engineering-dance-off.md # Keep existing
└── agents/                      # Agent prompts
    ├── common.md                # Shared instructions
    ├── meta.md
    ├── stack.md
    ├── structure.md
    ├── conventions.md
    ├── architecture.md
    ├── testing.md
    ├── claude-md.md
    └── generic.md               # Fallback for new files
```

### Session Artifacts

```
.agents/status/
└── YYYY-MM-DD-<feature>-session.md   # Per-session records
```

Session files follow the same naming pattern as design/plan:
- `.agents/design/YYYY-MM-DD-<feature>.md`
- `.agents/plan/YYYY-MM-DD-<feature>.md`
- `.agents/status/YYYY-MM-DD-<feature>-session.md`

Feature context is inferred from filename pattern — no separate STATUS.md needed.

### Session Record Format

```markdown
# Session: <feature> - YYYY-MM-DD HH:MM

## Context
- **Phase**: design | plan | implement | verify | retro
- **Feature**: <feature-name>
- **Related artifacts**:
  - Design: .agents/design/YYYY-MM-DD-<feature>.md
  - Plan: .agents/plan/YYYY-MM-DD-<feature>.md

## Session Summary
<!-- Brief description of what was accomplished -->

## Key Decisions
<!-- Important choices made during this session -->

## Issues Encountered
<!-- Problems, friction, blockers -->

## Findings for Retro
<!-- Things to review when running /retro -->
```

## Execution Flow

```
/retro
    │
    ├─► Phase 0: Gather Context
    │   ├── Read .agents/status/*-session.md files
    │   ├── Identify feature name from current session or recent plan
    │   ├── Load related artifacts (design, plan, sessions)
    │   └── Build context payload for agents
    │
    ├─► Phase 1: Parallel Prime Review
    │   ├── Spawn 8 Explore agents (haiku model):
    │   │   • meta, stack, structure, conventions
    │   │   • architecture, testing, claude-md, generic
    │   ├── Each agent receives:
    │   │   • agents/common.md (shared instructions)
    │   │   • agents/<file>.md (specific prompts)
    │   │   • Current prime file content
    │   │   • Cycle artifacts (design, plan, sessions)
    │   └── Agents diff against existing docs, return findings
    │
    ├─► Phase 2: Findings Synthesis
    │   ├── Collect all agent responses
    │   ├── Format findings grouped by file
    │   ├── Present to user with proposed changes
    │   └── User approves/rejects each finding
    │
    ├─► Phase 3: Apply Changes
    │   ├── Update approved prime files
    │   ├── Update CLAUDE.md Rules Summary if needed
    │   └── Commit changes
    │
    └─► Phase 4: Engineering Dance Off (optional)
        └── Same as current (for substantial changes)
```

## Review Prompts per Prime File

| Prime File | Review Focus |
|------------|--------------|
| META.md | Are writing guidelines being followed? Is Rules Summary in sync? |
| AGENTS.md | Multi-agent issues? New safety rules needed? |
| STACK.md | New tools/dependencies? Versions current? |
| STRUCTURE.md | New directories/patterns? Layout accurate? |
| CONVENTIONS.md | New naming patterns? Anti-patterns violated? |
| ARCHITECTURE.md | System design changes? New components/flows? |
| TESTING.md | Test strategy evolved? New patterns? |
| CLAUDE.md | Rules Summary accurate? New project rules? |
| **Generic** | Is content accurate, complete, actionable? |

## Key Design Decisions

### Parallel Agent Execution
- **Context**: Prime files are independent; reviewing sequentially wastes time
- **Decision**: Spawn 8 agents in parallel (one per target file)
- **Rationale**: Follows bootstrap-discovery pattern; haiku model is fast; reduces total execution time

### Diff-Based Findings
- **Context**: Don't want noise; only actionable improvements
- **Decision**: Agents compare cycle artifacts against existing docs, only surface warranted changes
- **Rationale**: Keeps findings focused; respects user's time

### Session Records in status/
- **Context**: Need to track multiple sessions per feature cycle
- **Decision**: Store session records in `.agents/status/YYYY-MM-DD-<feature>-session.md`
- **Rationale**: Reuses existing pattern; feature context inferred from filename

### No STATUS.md
- **Context**: Originally considered explicit cycle tracking file
- **Decision**: Removed — feature context inferred from artifact filenames
- **Rationale**: Simpler; less redundancy; same information derivable from naming pattern

## Scope

### In Scope
- Parallel prime file review with specific prompts per file
- CLAUDE.md review integrated into the parallel batch
- Session records in `.agents/status/YYYY-MM-DD-<feature>-session.md`
- Findings synthesis and user approval flow
- Generic prompt fallback for new prime files

### Future Scope (Designed For)
- Automatic session recording during phases (design, plan, implement)
- Full cycle history traversal across sessions
- Cross-session pattern detection

## Files to Create/Modify

### Create
- `skills/retro/agents/common.md` — Shared agent instructions
- `skills/retro/agents/meta.md` — META.md review prompts
- `skills/retro/agents/stack.md` — STACK.md review prompts
- `skills/retro/agents/structure.md` — STRUCTURE.md review prompts
- `skills/retro/agents/conventions.md` — CONVENTIONS.md review prompts
- `skills/retro/agents/architecture.md` — ARCHITECTURE.md review prompts
- `skills/retro/agents/testing.md` — TESTING.md review prompts
- `skills/retro/agents/claude-md.md` — CLAUDE.md review prompts
- `skills/retro/agents/generic.md` — Generic fallback prompts

### Modify
- `skills/retro/SKILL.md` — Update main flow to include prime review phase
- `skills/retro/references/review-and-remember.md` → `retro.md` — Rename and extend

### Keep
- `skills/retro/references/engineering-dance-off.md` — Unchanged

## Success Criteria

1. Running `/retro` spawns 8 parallel agents to review prime files + CLAUDE.md
2. Findings are grouped by file and presented for user approval
3. Approved changes are applied and committed
4. Session records can be created in `.agents/status/` with correct naming pattern
5. Generic prompt handles any new prime files not in the predefined list
