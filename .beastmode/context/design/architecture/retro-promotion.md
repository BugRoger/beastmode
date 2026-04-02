# Retro-Driven Knowledge Promotion

## Context
Knowledge generated during phase execution needs to flow upward from raw artifacts to curated summaries without phase code writing directly to context docs.

## Decision
Retro runs once at release with all phase artifacts — single-pass promotion. Context walker reviews the full cycle's artifacts and promotes L2->L1. Before creating any L3 record, the walker applies a value-add gate: the proposed L3 must provide rationale, constraints, provenance, or dissenting context beyond the L2 summary — otherwise it is silently skipped. All retro changes (L3/L2/L1/L0) apply automatically — no approval gate. Write protection ensures phases only write to artifacts/; retro and the compaction agent are the sole gatekeepers for context/.

## Rationale
- Clean separation: retro handles full-cycle accuracy at release, release handles product-level rollup
- Write protection: phases only write to artifacts/, retro is the sole gatekeeper for context/
- Single-pass model at release captures the complete picture before merge
- Auto-apply simplifies release flow — no manual intervention needed

## Source
state/design/2026-03-04-restore-phase-retro.md
state/design/2026-03-04-product-md-rollup.md
state/design/2026-03-07-meta-retro-rework.md
state/design/2026-03-08-retro-quick-exit.md
artifacts/design/2026-03-30-design-retro-always.md
.beastmode/artifacts/design/2026-03-31-context-tree-compaction.md
