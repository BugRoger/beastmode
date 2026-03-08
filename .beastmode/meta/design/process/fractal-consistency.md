# Fractal Consistency

## Observation 1
### Context
During progressive-l1-docs design, 2026-03-04
### Observation
Fractal consistency beats special-casing. When a structural pattern works for one domain, apply it uniformly to all domains without exceptions.
### Rationale
Special-casing adds complexity without value
### Source
state/design/2026-03-04-progressive-l1-docs.md
### Confidence
[HIGH] — promoted to SOP: "Mirror existing patterns before designing from scratch"

## Observation 2
### Context
During meta-hierarchy design, 2026-03-05
### Observation
Applying existing patterns to neglected domains reveals structural debt. Meta had flat L1 files while context had full L1/L2 hierarchy.
### Rationale
Structural consistency across domains enables better tooling
### Source
state/design/2026-03-05-meta-hierarchy.md
### Confidence
[HIGH] — promoted to SOP: "Mirror existing patterns before designing from scratch"

## Observation 3
### Context
During l2-domain-expansion design, 2026-03-06
### Observation
Session-seeded beats templates and stubs for L2 file creation. Seeding from the session that triggered the gap produces files with real content from day one.
### Rationale
The retro loop already produces real content — use it instead of generic templates
### Source
state/design/2026-03-06-l2-domain-expansion.md
### Confidence
[HIGH] — promoted to SOP: "Mirror existing patterns before designing from scratch"

## Observation 4
### Context
During meta-retro-rework design, 2026-03-07
### Observation
Mirroring an existing walker as a design template constrains the design space productively. The remaining decisions were scoped narrowly.
### Rationale
Start from existing algorithms when building structurally analogous subsystems
### Source
state/design/2026-03-07-meta-retro-rework.md
### Confidence
[HIGH] — promoted to SOP: "Mirror existing patterns before designing from scratch"

## Observation 5
### Context
During retro-quick-exit design, 2026-03-08
### Observation
Release phase had retro in execute step 8.5 while all other phases had retro in checkpoint. The inconsistency went unnoticed until an explicit phase-by-phase audit. Structural steps that apply to all phases must live in the same phase location across all five phases.
### Rationale
Fractal consistency violations hide in phases that "work fine" — only cross-phase comparison reveals them
### Source
state/design/2026-03-08-retro-quick-exit.md
### Confidence
[LOW] — first observation of this specific class (cross-phase step placement)
