# Divergence Audit

## Observation 1
### Context
During bulletproof-state-scanner design, 2026-03-29
### Observation
The design session's problem discovery came from a systematic divergence audit — comparing two implementations of the same concern line-by-line and cataloging 19 concrete divergences (missing phase support, broken transitions, incomplete gate coverage, different error handling). This audit technique is an extension of the existing "enumerate every instance in concrete tables" L1 rule, applied not to decision options but to competing implementations. The concrete divergence count (19) made the "kill one implementation" decision obvious — reconciliation of 19 differences would be higher effort and risk than a rewrite.
### Rationale
When multiple implementations of the same concern exist, a structured divergence audit (enumerate every difference in a concrete list) quantifies the problem and makes the design decision (kill vs. reconcile) data-driven rather than opinion-based.
### Source
.beastmode/state/design/2026-03-29-bulletproof-state-scanner.md
### Confidence
[LOW] — first observation; extends the "walk every instance" pattern from decision enumeration to implementation comparison

## Observation 2
### Context
During status-unfuckery-v2 design, 2026-03-29
### Observation
Spawning an Explore agent to audit the entire codebase subsystem (state scanner, status command, watch command, manifest handling) before asking any design questions produced a concrete 20-bug inventory that became the PRD's problem statement. This is a research-first approach applied internally rather than externally: instead of surveying competitor projects, the agent surveyed the actual codebase for structural defects. The bug count (20) made the scope of the overhaul self-evident and eliminated any debate about whether incremental fixes would suffice.
### Rationale
When designing an overhaul of an existing subsystem, auditing the codebase first (not from memory, not from assumptions) produces a concrete defect inventory that drives design scope. Extends the research-first pattern from external competitive analysis to internal codebase analysis.
### Source
.beastmode/state/design/2026-03-29-status-unfuckery-v2.md
### Confidence
[LOW] -- first observation; extends divergence-audit pattern from two-implementation comparison to full-subsystem bug audit
