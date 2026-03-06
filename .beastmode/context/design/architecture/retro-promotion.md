# Retro-Driven Knowledge Promotion

## Context
Knowledge generated during phase execution needs to flow upward from raw artifacts to curated summaries without phase code writing directly to context/meta docs.

## Decision
Two-stage promotion: retro agents (context-walker + meta-walker) run at checkpoint to promote L2->L1. Release phase runs L0 rollup step to promote L1->L0. Retro does not touch L0. Write protection ensures phases only write to state/; retro is the sole gatekeeper for context/meta.

## Rationale
- Clean separation: retro handles per-phase accuracy, release handles product-level rollup
- Write protection: phases only write to state/, retro is the sole gatekeeper for context/meta
- Two-stage model prevents premature L0 changes during feature work

## Source
state/design/2026-03-04-restore-phase-retro.md
state/design/2026-03-04-product-md-rollup.md
