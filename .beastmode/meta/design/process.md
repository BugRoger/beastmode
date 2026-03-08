# Design Process

Emerging process patterns from design phases. Eleven topic clusters spanning competitive analysis, fractal consistency, HITL gate design, cross-session state, instruction visibility, scope management, L0 content scoping, agent organization, external documentation drift, miscellaneous design patterns, and redundant upstream gatekeeping.

## Competitive Analysis
Research-informed design outperforms brainstorming. External reference points constrain the solution space and reveal integration gaps that internal review misses.
1. ALWAYS produce dated research artifacts from 3+ external sources before locking structural decisions
2. ALWAYS present structures as self-evident choices, not as imitations of other projects

## Fractal Consistency
Structural patterns should apply uniformly across domains. Mirroring existing algorithms constrains the design space productively and session-seeded content beats templates.
1. ALWAYS start from existing algorithms when building structurally analogous subsystems
2. ALWAYS seed new files from real session content, not generic templates

## HITL Gate Design
Gates require structural enforcement and single-mechanism decisions. Competing mechanisms on the same decision point create unpredictable behavior.
1. ALWAYS verify platform capabilities before locking architectural decisions
2. ALWAYS enumerate every instance in concrete tables for N-instance decisions
3. NEVER place competing gate mechanisms on the same decision point

## Instruction Visibility
Critical-path instructions must be visible markdown. HTML comments and @imported files lose priority against inline instructions on the critical path.
1. ALWAYS use visible markdown for critical-path instructions, not HTML comments
2. ALWAYS prefer inline over imported for execution-critical directives

## Scope Management
Explicit deferral and per-instance enumeration improve scope management. Users need multiple rounds to formalize vision. Deferred ideas should be challenged for inclusion.

## Cross-Session State
Session boundaries are a hard reset. Any state that subsequent phases need must be persisted to disk or re-derivable from arguments.

## L0 Content Scope
L0 should be persona + map, not operational manual. Operational details belong in skills. Pointer references beat content duplication.

## Agent Organization
"Spawned = agent" is the simplest classification rule. Naming conventions should encode workflow position. Dead code detection requires checking references, not existence.

## External Documentation Drift
External docs drift from internal knowledge hierarchy. The retro walker doesn't touch external docs. External-facing specs need periodic review.

## Miscellaneous Patterns
Root entry points should be pure wiring. Locked decisions can drift from implementation. Shared files are blind spots for phase-scoped refactors. Parsability constraints drive syntax design through multiple iterations.
1. ALWAYS include shared files (_shared/) in phase-scoped sweeps

## Redundant Upstream Gatekeeping
Subjective upstream skip-checks are harmful when downstream components handle empty input gracefully. Let the downstream agent decide there is nothing to do rather than preventing it from running.
