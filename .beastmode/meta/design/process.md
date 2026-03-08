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
- Explicit deferral and per-instance enumeration improve scope management — prevents scope creep during design
- Users need multiple rounds to formalize vision — don't rush to lock decisions
- Deferred ideas should be challenged for inclusion — prevents feature bloat

## Cross-Session State
- Session boundaries are a hard reset — any state that subsequent phases need must be persisted to disk
- State must be re-derivable from arguments or persisted artifacts — in-memory state vanishes across sessions

## L0 Content Scope
- L0 should be persona + map, not operational manual — operational details belong in skills
- Pointer references beat content duplication — reduces drift between duplicated content

## Agent Organization
- "Spawned = agent" is the simplest classification rule — avoids complex taxonomy debates
- Naming conventions should encode workflow position — makes agent roles self-documenting
- Dead code detection requires checking references, not existence — unreferenced code is dead code

## External Documentation Drift
- External docs drift from internal knowledge hierarchy — the retro walker doesn't touch external docs
- External-facing specs need periodic review — drift accumulates silently without scheduled checks

## Miscellaneous Patterns
- Root entry points should be pure wiring — keeps routing logic separate from behavior
- Locked decisions can drift from implementation — periodic reconciliation catches drift
- ALWAYS include shared files (_shared/) in phase-scoped sweeps — shared files are blind spots for phase-scoped refactors
- Parsability constraints drive syntax design through multiple iterations — expect iteration on machine-readable formats

## Redundant Upstream Gatekeeping
- Subjective upstream skip-checks are harmful when downstream components handle empty input gracefully — let the downstream agent decide there is nothing to do
