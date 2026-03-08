# Release: init-assets

**Version:** v0.14.35
**Date:** 2026-03-08

## Highlights

Rewrites the init skeleton assets to match 30+ releases of evolution, and cleans up beastmode's own meta directory to match the target pattern.

## Features

- Skeleton restructured: BEASTMODE.md, config.yaml (all gates human), research/, full L3 directory tree
- PRODUCT.md replaced by context/design/product.md
- State directory simplified: no L1 files, just phase subdirs with .gitkeep
- All 5 meta phase subdirs with process.md + workarounds.md + L3 dirs
- 12 context files (5 L1 + 7 L2) with minimal scaffolding templates

## Chores

- Reality: moved research/ from state/ to .beastmode/ root
- Reality: deleted obsolete meta/design/DESIGN.md
- Reality: migrated meta L2 process files (design, plan, implement, release) to ALWAYS/NEVER format
- Reality: added missing .gitkeep files to meta L3 directories

## Artifacts

- Design: .beastmode/state/design/2026-03-08-init-assets.md
- Plan: .beastmode/state/plan/2026-03-08-init-assets.md
- Validate: .beastmode/state/validate/2026-03-08-init-assets.md
