# Release 0.2.0

**Date:** 2026-03-04

## Highlights

Major architectural refactoring to align with VISION.md. Introduces a new `.beastmode/` data structure with four domains (product, state, context, meta), adds the `/validate` quality gate phase, and establishes `commands/` as a visible interface layer.

## Breaking Changes

- **New `.beastmode/` directory structure** — Replaces `.agents/prime/` with organized domains:
  - `PRODUCT.md` (L0) — Product vision
  - `state/` — Feature kanban (design → plan → implement → validate → release)
  - `context/` — Build knowledge (architecture, conventions, testing)
  - `meta/` — Self-improvement (learnings, overrides)

- **`/prime` reads from `.beastmode/`** — L0/L1/L2 hierarchical loading pattern
- **`/retro` writes to `.beastmode/meta/`** — Learnings go to meta domain
- **`CLAUDE.md` imports from `.beastmode/`** — No longer imports from `.agents/CLAUDE.md`
- **5-phase workflow** — design → plan → implement → validate → release (was 6-phase)

## Features

- **`/validate` skill** — Quality gate before release with tests, lint, type checks, and custom gates
- **`commands/` interface layer** — Phase contracts visible at root (design.md, plan.md, implement.md, validate.md, release.md)
- **L0/L1/L2 hierarchy** — Efficient context loading (L1 always loaded, L2 on-demand)
- **State as kanban** — Features flow through `.beastmode/state/{phase}/` directories

## Migration

Projects using `.agents/prime/` need to migrate to `.beastmode/`:

| Old Location | New Location |
|--------------|--------------|
| `.agents/CLAUDE.md` | `.beastmode/PRODUCT.md` + `context/` |
| `.agents/prime/ARCHITECTURE.md` | `.beastmode/context/design/architecture.md` |
| `.agents/prime/STACK.md` | `.beastmode/context/design/tech-stack.md` |
| `.agents/prime/CONVENTIONS.md` | `.beastmode/context/plan/conventions.md` |
| `.agents/prime/STRUCTURE.md` | `.beastmode/context/plan/structure.md` |
| `.agents/prime/AGENTS.md` | `.beastmode/context/implement/agents.md` |
| `.agents/prime/TESTING.md` | `.beastmode/context/implement/testing.md` |

Run `/bootstrap` on an existing project to create the new structure.

## Full Changelog

Commits since v0.1.12:
- d597830 docs: add vision document and cleanup config
- 2248580 chore: ignore local claude settings
- 0084155 feat: simplify session banner and add research agent docs
- 872f473 feat(directives): display SessionStart hook banner to user
- 7e3b66d chore: bump version to 0.1.15
- 5f6f906 fix(hooks): correct SessionStart hook configuration structure
- 81918ec chore: bump version to 0.1.14
- + vision-alignment cycle changes
