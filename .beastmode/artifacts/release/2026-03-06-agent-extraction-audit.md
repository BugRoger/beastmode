# Release: Agent Extraction Audit

**Version:** v0.14.18
**Date:** 2026-03-06

## Highlights

Centralizes all agent prompts into `agents/` with consistent `{phase}-{role}.md` naming. Removes dead code, fixes a missing researcher reference in plan prime.

## Chores

- Moved 5 discovery agents from `skills/beastmode/references/discovery-agents/` to `agents/init-{role}.md`
- Moved implementer agent from `skills/implement/references/` to `agents/implement-implementer.md`
- Renamed `agents/researcher.md` to `agents/common-researcher.md`
- Deleted dead `agents/discovery.md` (replaced by 5 specialized agents)
- Updated all `@import` paths in skills to reference new agent locations
- Added missing `common-researcher.md` reference to `skills/plan/phases/0-prime.md`

## Full Changelog

All changes are structural file moves and path updates. No behavioral changes.
