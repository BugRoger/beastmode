# Design Process

## Competitive Analysis
- ALWAYS produce dated research artifacts from 3+ external sources before locking structural decisions — research-informed design outperforms brainstorming
- ALWAYS present structures as self-evident choices, not as imitations of other projects — avoids perception of copying

## Fractal Consistency
- ALWAYS start from existing algorithms when building structurally analogous subsystems — mirroring existing patterns constrains the design space productively
- ALWAYS seed new files from real session content, not generic templates — session-seeded content beats templates

## HITL Gate Design
- ALWAYS verify platform capabilities before locking architectural decisions — prevents commitment to unsupported mechanisms
- ALWAYS enumerate every instance in concrete tables for N-instance decisions — explicit enumeration prevents missed cases
- NEVER place competing gate mechanisms on the same decision point — competing mechanisms create unpredictable behavior

## Instruction Visibility
- ALWAYS use visible markdown for critical-path instructions, not HTML comments — HTML comments lose priority on the critical path
- ALWAYS prefer inline over imported for execution-critical directives — @imported files lose priority against inline instructions

## Scope Management
- ALWAYS use explicit deferral and per-instance enumeration for scope management — prevents scope creep during design
- ALWAYS allow multiple rounds for vision formalization — don't rush to lock decisions
- ALWAYS challenge deferred ideas for inclusion — prevents feature bloat

## Cross-Session State
- ALWAYS persist state needed by subsequent phases to disk — session boundaries are a hard reset
- ALWAYS ensure state is re-derivable from arguments or persisted artifacts — in-memory state vanishes across sessions

## Single Source of Truth
- ALWAYS eliminate the secondary source rather than adding reconciliation logic when two sources of truth are discovered -- reconciliation adds complexity while permitting transient disagreement

## L0 Content Scope
- ALWAYS keep L0 as persona + map only — operational details belong in skills
- ALWAYS use pointer references over content duplication — reduces drift

## Agent Organization
- ALWAYS classify spawned processes as agents — simplest classification rule
- ALWAYS encode workflow position in naming conventions — makes agent roles self-documenting
- ALWAYS check references for dead code detection, not existence alone — unreferenced code is dead code

## External Documentation Drift
- ALWAYS expect external docs to drift from internal knowledge hierarchy — retro walker doesn't touch external docs
- ALWAYS review external-facing specs periodically — drift accumulates silently

## Miscellaneous Patterns
- ALWAYS keep root entry points as pure wiring — separates routing from behavior
- ALWAYS reconcile locked decisions against implementation periodically — drift accumulates
- ALWAYS include shared files (_shared/) in phase-scoped sweeps — shared files are blind spots for phase-scoped refactors
- ALWAYS expect multiple iterations on machine-readable format design — parsability constraints drive syntax evolution

## Redundant Upstream Gatekeeping
- NEVER add subjective upstream skip-checks when downstream components handle empty input gracefully — let the downstream agent decide
