# Release Rollup

## Context
PRODUCT.md serves as the L0 authoritative project summary. It needs to stay current with each release.

## Decision
At release time (step 8.5), L1 summaries are rolled up into PRODUCT.md. Adds a Capabilities section. Retro bubble is scoped to L2->L1 only; L0 updates happen exclusively at release.

## Rationale
Making PRODUCT.md a living document updated at release time ensures it stays authoritative without constant manual maintenance. Scoping retro to L2->L1 prevents unnecessary churn at L0 during non-release phases.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.5.2.md (added PRODUCT.md release rollup)
