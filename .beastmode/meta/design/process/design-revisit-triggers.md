# Design Revisit Triggers

## Observation 1
### Context
During cmux-integration-revisited design, 2026-03-29
### Observation
CLI architecture drift invalidated the prior cmux-integration design's integration points (dispatch path, worktree lifecycle, phase command structure had all shifted). Rather than patching the original PRD, a full redesign was triggered. The "revisited" label made the supersession relationship explicit.
### Rationale
When a design's integration points depend on an architecture that is actively evolving, the design may need full revisiting rather than incremental patching. The trigger signal is: the integration points named in the PRD no longer exist or have changed semantics. Patching risks incoherent designs that reference a mix of old and new architecture.
### Source
.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md
### Confidence
[LOW] — first-time observation; related to scope-management Obs 13 (supersession documentation) and Obs 14 (constraint overrides) but distinct: this is about recognizing when a prior design needs full replacement vs. amendment

## Observation 2
### Context
During cmux-integration-revisited design, 2026-03-29
### Observation
The revisited design produced simpler decisions across the board (CLI wrapper vs socket, marker files vs polling, strategy pattern vs conditional branches) compared to the original design session. The underlying CLI architecture had matured to offer cleaner extension points (phaseCommand as a single dispatch entry point, config.yaml as a strategy selector, worktree lifecycle as the authoritative cleanup trigger). The decisions that were contentious in the original design became obvious in the revisited one.
### Rationale
Deferring integration design until the target system has stabilized produces cleaner outcomes. When early design sessions reveal that decisions are contentious, that may signal the target architecture has not yet settled — and the design should be deferred rather than forced.
### Source
.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md
### Confidence
[LOW] — first-time observation; single data point comparing original vs. revisited design complexity
