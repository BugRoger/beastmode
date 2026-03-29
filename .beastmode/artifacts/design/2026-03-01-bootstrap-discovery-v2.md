# Design: bootstrap-discovery v2 — Parallel Agent Refactoring

**Date:** 2026-03-01
**Status:** Implemented

## Summary

Refactor bootstrap-discovery to spawn 5 parallel Explore agents (one per analysis prime), remove human-in-the-loop approval, and use agent-driven merge for idempotent re-runs.

## Context

The original bootstrap-discovery used a single Explore agent to analyze everything, then presented findings file-by-file with human approval (approve/edit/regenerate/skip). This was slow and required user interaction for each file.

**Inspiration:** [GSD Codebase Mapper](https://github.com/gsd-build/get-shit-done/blob/main/agents/gsd-codebase-mapper.md) — autonomous agent that explores codebases for specific focus areas and writes analysis documents directly.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent count | 5 parallel | One per analysis prime (STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING) |
| Excluded primes | META.md, AGENTS.md | Mostly static boilerplate |
| Execution model | All 5 in parallel | Maximum speed |
| Agent output | Complete markdown file | Simpler than JSON with per-section actions |
| Merge strategy | Agent-driven | Agent reads current content, preserves valid sections, fills gaps |
| Write responsibility | Coordinator | Writes agent output directly to prime files |
| Agent model | Haiku | Fast, cost-effective for exploration |
| Human approval | Removed | Fully autonomous |
| CLAUDE.md updates | Defer to META.md | No custom logic, follow existing conventions |

## Architecture

```
Coordinator:
  1. Check .agents/prime/ exists
  2. For each prime (STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING):
     - Read references/{prime}-agent.md
     - Read references/common-instructions.md
     - Read .agents/prime/{PRIME}.md
     - Concatenate into prompt
  3. Spawn 5 Explore agents in parallel with assembled prompts
  4. Collect markdown outputs
  5. Write each output to .agents/prime/{PRIME}.md
  6. Update CLAUDE.md per META.md conventions
  7. Offer to commit
```

```
┌─────────────────────────────────────────────────────────────┐
│                     Coordinator                              │
│  1. Assemble prompts (read + concatenate)                    │
│  2. Spawn 5 agents in parallel                               │
│  3. Collect markdown outputs                                 │
│  4. Write to prime files                                     │
│  5. Update CLAUDE.md (per META.md)                           │
│  6. Offer to commit                                          │
└─────────────────────────────────────────────────────────────┘
                          │
    ┌─────────┬───────────┼───────────┬───────────┐
    ▼         ▼           ▼           ▼           ▼
┌───────┐ ┌───────┐ ┌───────────┐ ┌────────────┐ ┌─────────┐
│ STACK │ │STRUCT │ │CONVENTIONS│ │ARCHITECTURE│ │ TESTING │
│ Agent │ │ Agent │ │   Agent   │ │   Agent    │ │  Agent  │
└───────┘ └───────┘ └───────────┘ └────────────┘ └─────────┘
     │         │           │              │            │
     ▼         ▼           ▼              ▼            ▼
  [markdown] [markdown] [markdown]   [markdown]   [markdown]
```

## Prompt Assembly

Each agent prompt is assembled by concatenating:

```
1. references/{prime}-agent.md      # Role + exploration hints
2. references/common-instructions.md # Output rules + safety
3. "## Current Content\n\n"
4. .agents/prime/{PRIME}.md          # Existing file content
```

Example assembled prompt for STACK agent:

```markdown
# STACK Agent Prompt

## Role
Analyze the technology stack for this codebase.

## Explore These Sources
- Package manifests: package.json, pyproject.toml, ...
[... rest of stack-agent.md ...]

# Common Instructions

## Output Format
Return the complete updated markdown file.
Preserve sections with real content.
Fill sections that have placeholders.
Update sections with stale information.
[... rest of common-instructions.md ...]

## Current Content

# STACK - Technology Stack
[... current .agents/prime/STACK.md content ...]
```

## Agent Output

Each agent returns a complete markdown file — the updated prime document. No JSON, no structured sections. Example:

```markdown
# STACK - Technology Stack

## Purpose
Documents the technology stack, dependencies, and versions used in this project.

## Core Stack

**Runtime:**
- Language: TypeScript 5.4
- Runtime: Bun 1.2

**Framework:**
- None (CLI tool)

**Database:**
- None

## Key Dependencies

| Package | Purpose |
|---------|---------|
| zod | Schema validation |
| commander | CLI argument parsing |

[... rest of file ...]
```

## Error Handling

- Agent timeout → skip prime, preserve existing, log warning
- Empty response → preserve existing
- Agent error → preserve existing, log warning

## Implementation Tasks

### Files to Update

| File | Change |
|------|--------|
| `SKILL.md` | Remove JSON schema, add explicit prompt assembly instructions |
| `common-instructions.md` | Change output format from JSON to markdown, add merge instructions |
| `stack-agent.md` | Add "preserve existing valid content" instruction |
| `structure-agent.md` | Add "preserve existing valid content" instruction |
| `conventions-agent.md` | Add "preserve existing valid content" instruction |
| `architecture-agent.md` | Add "preserve existing valid content" instruction |
| `testing-agent.md` | Add "preserve existing valid content" instruction |

### Implementation Order

1. Update `common-instructions.md` with new output format
2. Update all 5 agent prompt files with merge instructions
3. Rewrite `SKILL.md` with explicit prompt assembly flow
4. Test on this project (beastmode)
