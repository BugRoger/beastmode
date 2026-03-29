# Standard Gates

## Context
Every validation report includes sections for tests, lint, and type checks. For markdown-only projects these are always skipped, but the sections still appear to confirm the validator considered them. For code projects, standard gates run and produce real results.

## Decision
Standard gates (tests, lint, types) are included in every report. When applicable, they run and report results (pass counts, error counts). When not applicable, they are annotated as skipped. Skipped is not-applicable, not a failure.

## Rationale
Consistent report structure regardless of project type. Explicit skip annotation proves the gate was considered, not forgotten. For code projects, standard gates provide concrete quality signals (e.g., 220 tests / 0 failures, zero type errors) that complement acceptance criteria.

## Source
- .beastmode/artifacts/validate/2026-03-04-agents-to-beastmode-migration.md
- .beastmode/artifacts/validate/2026-03-05-hitl-adherence.md
- .beastmode/artifacts/validate/2026-03-06-banner-visibility-fix.md
- .beastmode/artifacts/validate/2026-03-29-cmux-integration-revisited.md
