# Release: retro-gate-hierarchy

**Version:** v0.14.33
**Date:** 2026-03-08

## Highlights

Retro gates reorganized to align with the knowledge hierarchy (L0-L3). Four gates now fire bottom-up: records (L3) → context (L2) → phase (L1) → beastmode (L0). Walker outputs are merged before gating instead of interleaved.

## Features

- Four hierarchy-aligned retro gates: `retro.records`, `retro.context`, `retro.phase`, `retro.beastmode`
- Both walkers (context + meta) spawn in parallel and merge outputs by hierarchy level
- L0 updates flow through `retro.beastmode` gate, available to any phase (not just release)
- L1 summary recomputation now gated through `retro.phase` instead of being a silent side-effect
- `release.beastmode-md-approval` absorbed into `retro.beastmode`

## Full Changelog

- `.beastmode/config.yaml` — retro gates renamed, `release.beastmode-md-approval` removed
- `skills/_shared/retro.md` — full restructure: parallel walkers, merged output, bottom-up gate sequence
- `skills/release/phases/1-execute.md` — L0 proposal step removed (now in retro)
- `docs/configurable-gates.md` — diagram and examples updated
- `.beastmode/context/design/architecture.md` — gate references updated
- `.beastmode/context/design/architecture/retro-reconciliation.md` — gate references updated
- `.beastmode/context/design/architecture/retro-promotion.md` — gate references updated
