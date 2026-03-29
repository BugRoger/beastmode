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

## Observation 2
### Context
During status-unfuckery-v2 design, 2026-03-29
### Observation
Design decisions were informed by reading actual manifest files on disk rather than assuming their contents. The audit discovered that existing pipeline manifests (bulletproof-state-scanner.manifest.json, interactive-cmux-workspaces.manifest.json) may not have top-level `phase` fields, that the reconciler writes a `phases` map in a different format than the scanner expects, and that 118 of 120 discovered epics were historical junk from state/design/ files. These were facts from disk, not assumptions.
### Rationale
When designing against existing data formats, reading the actual files on disk prevents designing against imagined structures. The gap between assumed and actual data shapes was large enough that a design based on assumptions would have been wrong.
### Source
.beastmode/state/design/2026-03-29-status-unfuckery-v2.md
### Confidence
[LOW] -- first observation; extends Obs 1 (skeleton-vs-reality comparison) from templates to runtime data files
