# Retro-Driven Knowledge Promotion

## Context
Knowledge generated during phase execution needs to flow upward from raw artifacts to curated summaries without phase code writing directly to context/meta docs.

## Decision
Retro always runs at checkpoint — no quick-exit gating. Walkers handle empty phases gracefully. Two-stage promotion: retro agents (context-walker + meta-walker) run at checkpoint to promote L2->L1. Release phase runs L0 rollup step to promote L1->L0. Retro does not touch L0. Write protection ensures phases only write to state/; retro is the sole gatekeeper for context/meta. Meta walker mirrors the context walker algorithm with confidence-gated promotion: [HIGH] promotes immediately to L1 Procedures, [MEDIUM] + 3 observations promotes to L1, [LOW] + 3 observations upgrades to [MEDIUM]. Two meta retro gates: retro.records (L3 creation/appends) and retro.promotions (L1/L2 upgrades).

## Rationale
- Clean separation: retro handles per-phase accuracy, release handles product-level rollup
- Write protection: phases only write to state/, retro is the sole gatekeeper for context/meta
- Two-stage model prevents premature L0 changes during feature work
- Confidence-gated promotion prevents premature knowledge graduation
- Two gates organized by action type (what user approves) rather than output category

## Source
state/design/2026-03-04-restore-phase-retro.md
state/design/2026-03-04-product-md-rollup.md
state/design/2026-03-07-meta-retro-rework.md
state/design/2026-03-08-retro-quick-exit.md
