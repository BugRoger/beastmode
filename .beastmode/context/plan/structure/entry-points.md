# Entry Points

## Context
Claude Code loads CLAUDE.md at session start. The autoload budget is limited, so the wiring from CLAUDE.md to the knowledge hierarchy must be minimal.

## Decision
`CLAUDE.md` imports `@.beastmode/BEASTMODE.md` as sole autoload (~120 lines). No additional @imports in CLAUDE.md. Skills load their own L1 context during 0-prime sub-phase. Each skill is a self-contained `SKILL.md` with inline phases as `## Phase N` headings — no external imports.

## Rationale
- Single autoload keeps token budget predictable and small
- Skills loading their own context during prime means only relevant context is loaded
- Self-contained SKILL.md eliminates indirection and parsing overhead
- Convention-based discovery makes the system self-navigating

## Source
state/plan/2026-03-06-hierarchy-cleanup.md
