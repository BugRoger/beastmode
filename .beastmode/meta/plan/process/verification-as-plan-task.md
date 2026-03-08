# Verification as Plan Task

## Observation 1
### Context
During init-l2-expansion planning, 2026-03-08
### Observation
Task 6 (Verify Full Skeleton Tree) is a standalone verification task that checks the entire output tree against expected structure. Separating verification from implementation tasks ensures drift detection between plan specifications and actual output. The verification task runs last (Wave 3) after all creation tasks complete.
### Rationale
Dedicated verification tasks catch structural drift that per-task checks miss. A holistic tree comparison is more reliable than individual task assertions.
### Source
state/plan/2026-03-08-init-l2-expansion.md
### Confidence
[LOW] — first observation
