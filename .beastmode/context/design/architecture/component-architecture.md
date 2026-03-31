# Component Architecture

## Context
Beastmode's codebase needs clear structural organization separating workflow definitions, shared utilities, and autonomous agents.

## Decision
Skills (workflow verbs) in `/skills/`, shared utilities in `skills/_shared/`, retro agents and utility agents (compaction) in `/agents/`. Utility agents have no phase lifecycle and no retro-on-the-agent. Each skill has SKILL.md manifest, `phases/` directory (0-3), and optional `references/`. Phase checkpoint files may use blockquote directives before @imports to override shared skill behavior (e.g., skipping the Quick-Exit Check in retro). Directives reference sections by name, not step number, to survive renumbering.

## Rationale
- Colocation of interface with implementation prevents drift
- Shared logic in `_shared/` avoids duplication across skills
- Agent extraction keeps retro logic independent of phase skills
- Blockquote directives let phase checkpoints customize shared imports without forking the shared file

## Source
artifacts/design/2026-03-30-design-retro-always.md
.beastmode/artifacts/design/2026-03-31-context-tree-compaction.md
