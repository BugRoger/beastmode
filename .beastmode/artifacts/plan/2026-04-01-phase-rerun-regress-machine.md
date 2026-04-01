---
phase: plan
slug: phase-rerun
epic: phase-rerun
feature: regress-machine
wave: 1
---

# Regress Machine

**Design:** .beastmode/artifacts/design/2026-04-01-phase-rerun.md

## User Stories

1. As a user, I want to run `beastmode plan <slug>` on an epic that's past plan, so that I can redo the plan without starting a new epic.
2. As a user, I want to rerun the current phase (e.g., `beastmode validate <slug>` when already at validate), so that I can retry a phase that produced bad output.
3. As a user, I want the watch loop to auto-regress from validate to implement on failure, so that automated pipelines self-heal without manual intervention.

## What to Build

A generic REGRESS event in the XState epic machine that replaces the existing VALIDATE_FAILED event. The event carries a targetPhase payload indicating where to regress to.

**Event definition:** `{ type: "REGRESS", targetPhase: Phase }` added to the EpicEvent union type. VALIDATE_FAILED is removed entirely.

**Guard:** Rejects REGRESS if targetPhase is "design" (start a new epic instead), or if targetPhase is ahead of the current phase (that's a forward jump, not regression). Same-phase rerun is allowed (targetPhase == currentPhase).

**Actions:** On REGRESS, set manifest phase to targetPhase. If regressing to or past "implement", reset all features to "pending" status. Clear the blocked field. Clear downstream artifact entries (artifacts for phases after targetPhase).

**REGRESS must be available from every non-terminal state** (plan, implement, validate, release) — not just validate. This is the generic mechanism.

**Manifest pure function:** Add a `regress()` function to the manifest module that applies the regression logic (phase reset, feature reset, artifact cleanup) to a PipelineManifest object. The machine action delegates to this function.

**Test coverage:** REGRESS from every phase to every valid earlier phase; guard rejects design target; guard rejects forward jumps; features reset correctly on regression to/past implement; features untouched on regression that doesn't cross implement boundary (e.g., release → validate).

## Acceptance Criteria

- [ ] REGRESS event defined in EpicEvent type with targetPhase payload
- [ ] VALIDATE_FAILED event removed from types, machine, and all consumers
- [ ] Guard rejects design as targetPhase
- [ ] Guard rejects forward jumps (targetPhase > currentPhase)
- [ ] Same-phase rerun accepted (targetPhase == currentPhase)
- [ ] Features reset to "pending" when regressing to or past implement
- [ ] Features untouched when regressing within post-implement phases
- [ ] Blocked field cleared on regression
- [ ] Downstream artifacts cleared on regression
- [ ] regress() pure function in manifest module
- [ ] All existing VALIDATE_FAILED tests migrated to REGRESS equivalents
