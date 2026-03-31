# Core Directories

## Context
Beastmode's file system layout needs clear separation of concerns across multiple top-level directories.

## Decision
`.beastmode/` stores L0-L3 knowledge hierarchy plus config.yaml and worktrees/ (gitignored). `skills/` contains workflow verb implementations with phases in `skills/{verb}/phases/`. `agents/` has standalone agent prompts. Cross-skill utilities (task-runner) live at `skills/` root — no `_shared/` subdirectory. `hooks/` contains plugin lifecycle scripts. `docs/` for external-facing essays. `scripts/` for maintenance scripts.

## Rationale
Each directory has a single responsibility. Skills are verb-organized for discovery. Agents are standalone for parallel spawning. Shared utilities prevent duplication. docs/ not imported by agents to avoid polluting context. hooks/ isolates plugin lifecycle from workflow logic.

## Source
state/plan/2026-03-06-hierarchy-cleanup.md
state/plan/2026-03-05-key-differentiators.md
state/plan/2026-03-05-squash-per-release.md
state/plan/2026-03-02-session-banner.md
