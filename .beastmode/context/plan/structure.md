# Structure

## Core Directories
- ALWAYS put phase-specific logic in `skills/{verb}/phases/` — colocated with skill
- ALWAYS put cross-skill utilities in `skills/_shared/` — reuse
- ALWAYS put agent prompts in `agents/` as standalone documents — separation from skills
- ALWAYS put plugin lifecycle hooks in `hooks/` as executable scripts — lifecycle management
- ALWAYS put external-facing essays in `docs/` — not imported by agents
- Gate config lives at `.beastmode/config.yaml` — centralized configuration
- NEVER store knowledge outside `.beastmode/` — single source of truth
- NEVER write to context/ or meta/ from phase execution — only retro promotes to L0/L1/L2
- `.beastmode/` stores L0-L3 knowledge hierarchy plus config.yaml and worktrees/<feature>/ (gitignored) — central hub

## Knowledge Directories
- ALWAYS organize context by phase: `context/{phase}/{domain}.md` — phase-scoped knowledge
- ALWAYS organize meta by phase: `meta/{phase}/{type}.md` (sops, overrides, learnings) — categorized process knowledge
- ALWAYS organize state by phase: `state/{phase}/YYYY-MM-DD-{feature}.md` — date-prefixed artifacts
- L3 records live at: `context/{phase}/{domain}/{record}.md` — subdirectory per domain
- Write protection: phases write only to state/, retro promotes to context/ and meta/ — enforced boundaries

## Entry Points
- ALWAYS wire CLAUDE.md -> BEASTMODE.md as sole autoload — minimal L0
- NEVER add additional @imports to CLAUDE.md — one entry point
- Skills discover their own L1/L2 context during 0-prime sub-phase — self-loading
- Each SKILL.md imports the shared task-runner at the end — standardized execution

## Related Decisions
- Migration from .agents/ to .beastmode/ — see [agents-to-beastmode-migration](../../state/plan/2026-03-04-agents-to-beastmode-migration.md)
- Worktree session discovery — see [worktree-session-discovery](../../state/plan/2026-03-04-worktree-session-discovery.md)
- Progressive L1 docs restructure — see [progressive-l1-docs](../../state/plan/2026-03-04-progressive-l1-docs.md)
- CLI-owned worktree lifecycle — see [epic-worktree-lifecycle](../../state/plan/2026-03-29-epic-worktree-lifecycle.manifest.json)
