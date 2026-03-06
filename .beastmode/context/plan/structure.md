# Structure

Directory layout for beastmode. `.beastmode/` is the central context hub. `skills/` contains agent workflows. `agents/` houses subagent prompts. Knowledge hierarchy (context/, meta/, state/) lives under `.beastmode/`.

## Core Directories
`.beastmode/` stores L0-L3 knowledge hierarchy. `skills/` contains workflow verb implementations. `agents/` has standalone agent prompts. `skills/_shared/` has cross-skill utilities.

1. ALWAYS put phase-specific logic in `skills/{verb}/phases/`
2. ALWAYS put cross-skill utilities in `skills/_shared/`
3. ALWAYS put agent prompts in `agents/` as standalone documents
4. NEVER store knowledge outside `.beastmode/`

## Knowledge Directories
`context/` for published knowledge (L1 summaries + L2 details + L3 records). `meta/` for learnings (L1 summaries + L2 SOPs/overrides/learnings). `state/` for checkpoint artifacts.

1. ALWAYS organize context by phase: `context/{phase}/{domain}.md`
2. ALWAYS organize meta by phase: `meta/{phase}/{type}.md` (sops, overrides, learnings)
3. ALWAYS organize state by phase: `state/{phase}/YYYY-MM-DD-{feature}.md`
4. L3 records live at: `context/{phase}/{domain}/{record}.md`

## Entry Points
`CLAUDE.md` imports `@.beastmode/BEASTMODE.md` (sole autoload). Skills load L1 during prime. `/skills/{verb}/SKILL.md` defines each skill's interface.

1. ALWAYS wire CLAUDE.md → BEASTMODE.md as sole autoload
2. NEVER add additional @imports to CLAUDE.md
3. Skills discover their own L1/L2 context during prime sub-phase
