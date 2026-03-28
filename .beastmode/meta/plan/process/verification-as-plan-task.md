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
[MEDIUM] — second observation confirming pattern

## Observation 2
### Context
During github-state-model planning, 2026-03-28
### Observation
Task 5 (Verify End-to-End) is a standalone verification task with 5 verification steps checking file existence, routing completeness, config correctness, sub-issue operations, and subcommand integrity. It runs in Wave 4 after all creation and modification tasks complete. Verification covers both new files and modifications to existing files.
### Rationale
Second confirmation that dedicated verification tasks catch structural drift. The multi-step verification approach (5 separate checks) is more thorough than a single tree comparison.
### Source
state/plan/2026-03-28-github-state-model.md
### Confidence
[MEDIUM] — second observation confirming pattern
