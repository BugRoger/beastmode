# Release v0.14.8 — The Declutter

**Date:** 2026-03-06

## Highlights

Removed `.beastmode/CONTEXT.md` and `.beastmode/STATE.md` — two L0 domain entry files that were auto-loaded every session but never referenced by any skill, hook, or agent. Saves context budget on every session start.

## Chores

- Remove `.beastmode/CONTEXT.md` (routing table duplicated by hierarchy conventions)
- Remove `.beastmode/STATE.md` (kanban unused, `/beastmode:status` covers status needs)

## Full Changelog

- Delete CONTEXT.md — L0 domain entry for Context (routing table only, zero consumers)
- Delete STATE.md — L0 domain entry for State + kanban board (zero consumers)
- Add design doc, plan, validation report to state/
