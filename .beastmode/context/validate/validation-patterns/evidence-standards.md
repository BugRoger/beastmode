# Evidence Standards

## Context
Gate results need to be verifiable, not just asserted. "PASS" without evidence is meaningless.

## Decision
Every gate result requires specific evidence: tables with pass/fail columns, counts, line numbers, file paths, grep results. Tabular format is mandatory for acceptance criteria.

## Rationale
The strongest validation reports (hitl-adherence, meta-hierarchy, squash-per-release) include exact line numbers, grep counts, and file path verification. Reports that merely assert PASS without evidence cannot be audited after the fact.

## Source
- .beastmode/artifacts/validate/2026-03-05-hitl-adherence.md
- .beastmode/artifacts/validate/2026-03-05-meta-hierarchy.md
- .beastmode/artifacts/validate/2026-03-05-squash-per-release.md
