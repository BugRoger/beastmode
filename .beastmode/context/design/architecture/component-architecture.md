# Component Architecture

## Context
Beastmode's codebase needs clear structural organization separating workflow definitions, shared utilities, and autonomous agents.

## Decision
Skills (workflow verbs) in `/skills/`, shared utilities in `skills/_shared/`, retro agents in `/agents/`. Each skill has SKILL.md manifest, `phases/` directory (0-3), and optional `references/`.

## Rationale
- Colocation of interface with implementation prevents drift
- Shared logic in `_shared/` avoids duplication across skills
- Agent extraction keeps retro logic independent of phase skills

## Source
Source artifact unknown — backfill needed
