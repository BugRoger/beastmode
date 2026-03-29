# Acceptance Criteria Verification

## Context
Every validation report traces its custom gates back to design acceptance criteria. Criteria are numbered, presented in tables, and given explicit PASS/FAIL/DEFER status. This pattern appeared in all 41 validation artifacts.

## Decision
Acceptance criteria from design are the source of truth for validation gates. Each criterion becomes a named check with an unambiguous status. DEFER status is used when verification requires conditions not available in the current session.

## Rationale
Traceability from design to validation closes the loop. Individual criterion reporting (not aggregate) catches partial implementations. DEFER prevents false PASSes without blocking release.

## Source
- .beastmode/artifacts/validate/2026-03-05-key-differentiators.md
- .beastmode/artifacts/validate/2026-03-06-knowledge-hierarchy-format.md
- .beastmode/artifacts/validate/20260306-context-write-protection.md
