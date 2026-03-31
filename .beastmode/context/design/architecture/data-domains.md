# Data Domains

## Context
Different types of information have different lifecycles and purposes. Feature state, build knowledge, and self-improvement data need distinct update patterns.

## Decision
Three domains: Artifacts (committed skill outputs at `.beastmode/artifacts/`), State (gitignored pipeline manifests at `.beastmode/state/`), Context (published knowledge at `.beastmode/context/`). Artifacts holds committed phase outputs organized by phase subdirs. State holds gitignored manifest JSON files with a top-level `phase` field as the single phase source of truth. Manifest logic split into manifest-store.ts (filesystem boundary) and manifest.ts (pure state machine). Context documents how to build. Research lives at `.beastmode/research/` (not under state/) as reference material. Every L2 file has a matching L3 directory with .gitkeep for retro expansion.

## Rationale
- Clear separation enables focused updates without cross-contamination
- State as workflow tracker maps naturally to feature lifecycle

## Source
state/design/2026-03-01-bootstrap-discovery-v2.md
state/design/2026-03-07-meta-retro-rework.md
state/design/2026-03-08-init-assets.md
state/design/2026-03-29-bulletproof-state-scanner.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
