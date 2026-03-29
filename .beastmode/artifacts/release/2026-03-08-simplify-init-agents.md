# Release: simplify-init-agents

**Version:** v0.14.38
**Date:** 2026-03-08

## Highlights

Init discovery agents promoted from prompt templates to first-class registered agents. Dead reference docs removed. Net -95 lines.

## Chores

- **First-class init agents** — 5 init-* agents made self-contained with `@common-instructions.md` import; dispatched via registered `beastmode:init-*` types instead of manual prompt assembly
- **common-instructions.md relocated** — Moved from `skills/beastmode/references/discovery-agents/` to `agents/` (lives next to the agents that use it)
- **Brownfield dispatch simplified** — `init.md` prompt assembly + concatenation replaced with direct registered agent dispatch (~30 lines removed)
- **Dead reference docs removed** — Deleted `gate-check.md` and `transition-check.md` (both self-documented as "Reference Only — NOT @imported")

## Full Changelog

- agents/init-*.md: replaced "content below" with direct file read, added @common-instructions.md import
- agents/common-instructions.md: new file (moved from discovery-agents/)
- skills/beastmode/subcommands/init.md: simplified brownfield steps 3-6 to steps 3-4
- skills/_shared/gate-check.md: deleted (22 lines)
- skills/_shared/transition-check.md: deleted (28 lines)
- skills/beastmode/references/discovery-agents/: deleted directory
