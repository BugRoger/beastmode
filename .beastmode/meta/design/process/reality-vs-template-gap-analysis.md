# Reality vs Template Gap Analysis

## Observation 1
### Context
During init-assets design, 2026-03-08
### Observation
Comparing a stale asset skeleton (22 files) against evolved reality (100+ files) was an effective method for identifying structural drift. The comparison surfaced 6 concrete gaps (missing config.yaml, wrong PRODUCT.md placement, wrong L1 format, wrong meta structure, missing L3 dirs, dead state L1 files) in a single systematic pass.
### Rationale
When templates/skeletons lag behind evolved reality, direct structural comparison produces a concrete gap list faster than trying to reason about what changed from memory. The method is especially effective when drift has accumulated over many versions.
### Source
state/design/2026-03-08-init-assets.md
### Confidence
[LOW] -- first observation; related to external-docs-drift cluster but specifically about internal skeleton/template assets
