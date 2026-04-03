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

## Known Pre-existing Failures
- `state-scanner.test.ts` line 109: expects `design -> single` but v0.59.0 changed dispatch to `design -> skip` — not in scope for any current epic, do not triage repeatedly
- ALWAYS record the pre-existing failure count baseline from main in validation reports — prevents re-triaging known failures across epics
- Baseline as of 2026-04-03 (post implement-v3): 0 test failures (60/60 pass), 28 type errors on main
