# HITL Gate Design

## Observation 1
### Context
During hitl-gate-config design, 2026-03-04
### Observation
Research platform constraints before locking architecture. Initial design assumed /clear could be issued programmatically — web research revealed it's user-only, forcing a redesign.
### Rationale
Always verify platform capabilities before locking architectural decisions
### Source
state/design/2026-03-04-hitl-gate-config.md
### Confidence
[HIGH] — promoted to SOP: "Research before structural design decisions"

## Observation 2
### Context
During hitl-gate-config design, 2026-03-04
### Observation
Concrete per-gate analysis eliminates bad abstractions. Walking through each gate with "what does skip actually do here?" revealed skip was either dangerous or redundant.
### Rationale
Case-by-case analysis beats abstract taxonomy debates
### Source
state/design/2026-03-04-hitl-gate-config.md
### Confidence
[HIGH] — promoted to SOP: "Walk every instance, don't describe the pattern"

## Observation 3
### Context
During meta-hierarchy design, 2026-03-05
### Observation
HITL gates are easy to forget when restructuring data layers. Initial design omitted gates entirely — user had to remind about them.
### Rationale
When a feature touches a write path with existing HITL gates, check the gate inventory
### Source
state/design/2026-03-05-meta-hierarchy.md
### Confidence
[MEDIUM] — confirmed pattern

## Observation 4
### Context
During hitl-adherence design, 2026-03-05
### Observation
Competing mechanisms on the same decision create unpredictable behavior. HARD-GATE forced human mode while config.yaml offered auto mode. Audit and remove all unconditional overrides covering the same decision point.
### Rationale
Single decision point must have single mechanism
### Source
state/design/2026-03-05-hitl-adherence.md
### Confidence
[MEDIUM] — confirmed pattern

## Observation 5
### Context
During meta-retro-rework design, 2026-03-07
### Observation
Gates should map to user decisions, not internal data categories. Consolidating 3 gates (learnings/sops/overrides) into 2 (records/promotions) reduces gate fatigue.
### Rationale
Organize approval flows by what users decide, not by data taxonomy
### Source
state/design/2026-03-07-meta-retro-rework.md
### Confidence
[LOW] — first application of this principle
