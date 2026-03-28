# Stale Context Detection During Prime

## Observation 1
### Context
During github-phase-integration planning, 2026-03-28
### Observation
The plan phase's prime step detected a stale L1 context rule and flagged it for the retro to fix rather than correcting it inline. This is the correct behavior -- phases write to state only, retro promotes upward. Detecting staleness early (during prime) and deferring the fix (to retro) preserves the separation of concerns.
### Rationale
Phases discovering stale meta content is a healthy signal that the meta hierarchy is being actively consulted. Deferring the fix to retro (rather than editing meta during planning) respects the knowledge hierarchy's write discipline.
### Source
state/plan/2026-03-28-github-phase-integration.manifest.json
### Confidence
[LOW] -- first observation
