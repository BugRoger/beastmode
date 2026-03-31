# Release Rollup

## Context
BEASTMODE.md serves as the L0 authoritative project configuration. It needs to stay current with each release.

## Decision
At release time, L1 summaries are rolled up into a BEASTMODE.md update proposal. Retro propagates L3 -> L2 -> L1 automatically. Only L0 updates require human approval via the `retro.beastmode` gate.

## Rationale
Making BEASTMODE.md a living document updated at release time ensures it stays authoritative without constant manual maintenance. Gating only L0 prevents unnecessary churn from automatic retro while ensuring human review for the highest-level project configuration.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.5.2.md (added L0 release rollup)
- .beastmode/artifacts/design/2026-03-31-retro-consolidation.md (collapsed four retro gates to single retro.beastmode gate, confirmed L0 target is BEASTMODE.md)
