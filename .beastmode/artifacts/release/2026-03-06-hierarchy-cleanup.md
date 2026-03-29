# Release v0.14.0

**Date:** 2026-03-06

## Highlights

Replaces the ambiguous three-file L0 loading model (PRODUCT.md, META.md, .beastmode/CLAUDE.md) with a single BEASTMODE.md system manual. Removes @imports between hierarchy levels in favor of convention-based paths.

## Features

- **BEASTMODE.md system manual** — Single L0 file (~108 lines) containing hierarchy spec, persona, writing rules, and conventions. Sole autoload via CLAUDE.md.
- **Convention-based navigation** — @imports removed from all L1 files. L2 files discovered via directory convention (`context/{phase}/{domain}.md`).
- **Three data domains** — Product domain merged into Context (via `context/design/product.md`). Architecture simplified from four domains to three (State/Context/Meta).
- **Updated retro agents** — Convention-based L2 discovery replaces @import parsing in retro-context.md and retro-meta.md.
- **Updated progressive-hierarchy.md** — Documentation reflects new BEASTMODE.md model and convention-based loading.

## Artifacts
- Design: .beastmode/state/design/2026-03-06-hierarchy-cleanup.md
- Plan: .beastmode/state/plan/2026-03-06-hierarchy-cleanup.md
- Validate: .beastmode/state/validate/2026-03-06-hierarchy-cleanup.md
- Release: .beastmode/state/release/2026-03-06-v0.14.0.md
