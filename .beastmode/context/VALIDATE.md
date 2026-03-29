# Validate Context

## Quality Gates
- ALWAYS run all configured quality checks before release
- NEVER proceed to release with failing quality gates
- Acceptance criteria from design docs are a primary gate regardless of project type
- Standard gates (tests, types, lint) run when configured; skipped gates are annotated, not failures

## Validation Patterns
- ALWAYS follow the standard report structure for validation artifacts
- ALWAYS trace custom gates back to design acceptance criteria
- NEVER assert PASS without verifiable evidence
