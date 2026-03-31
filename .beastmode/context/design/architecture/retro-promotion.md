# Retro-Driven Knowledge Promotion

## Context
Knowledge generated during phase execution needs to flow upward from raw artifacts to curated summaries without phase code writing directly to context/meta docs.

## Decision
Retro always runs at checkpoint — no quick-exit gating. Walkers handle empty phases gracefully. Two-stage promotion: retro agents (context-walker + meta-walker) run at checkpoint to promote L2->L1. Before creating any L3 record, walkers apply a value-add gate: the proposed L3 must provide rationale, constraints, provenance, or dissenting context beyond the L2 summary — otherwise it is silently skipped. L0 updates flow through retro.beastmode gate, available to any phase. Write protection ensures phases only write to state/; retro and the compaction agent are the sole gatekeepers for context/meta. Meta walker mirrors the context walker algorithm with confidence-gated promotion: [HIGH] promotes immediately to L1 Procedures, [MEDIUM] + 3 observations promotes to L1, [LOW] + 3 observations upgrades to [MEDIUM]. Four hierarchy-aligned retro gates: retro.records (L3), retro.context (L2), retro.phase (L1), retro.beastmode (L0).

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
artifacts/design/2026-03-30-design-retro-always.md
.beastmode/artifacts/design/2026-03-31-context-tree-compaction.md
