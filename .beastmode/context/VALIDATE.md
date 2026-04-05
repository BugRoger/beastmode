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
- Baseline as of 2026-04-05 (post github-sync-polish): 70 test files passing (1333 individual tests), 4 failing (pre-existing Bun-in-Node incompatibilities: verbosity.test.ts, event-log-fallback.test.ts, monokai-palette.test.ts, tree-format.palette.test.ts); 17 type errors (pre-existing in untouched files)

## Type Error Fixup Patterns
Common type errors introduced by new test files that require fixup before the type gate passes:
- Unused parameter names: prefix with `_` (e.g., `element` → `_element`, `world` → `_world`)
- String literal type narrowing: declare as `const x: string = "value"` instead of `const x = "value"` when the inferred literal type is too narrow for the target parameter
- Missing `undefined` in mock type: optional config fields need explicit `| undefined` annotation on mock objects
- ALWAYS fix new type errors during validate — keeping the type gate clean is the acceptance gate, not an implement concern

## Targeted Re-Dispatch

- ALWAYS write `failedFeatures: feat-a,feat-b` (comma-separated slugs) in validate artifact frontmatter when specific failing features can be identified — pipeline uses this to send REGRESS_FEATURES instead of blanket REGRESS
- NEVER write `failedFeatures` when status is passed — only present on failure with identifiable per-feature failures
- Identify failing features by mapping integration test failures to feature slugs via naming conventions (file naming, tags, describe blocks) — same conventions as implement BDD verification
- When feature-level identification is not possible (non-feature-scoped tests), omit `failedFeatures` and let the pipeline fall back to blanket regression
- Per-feature re-dispatch budget is 2 cycles; the third failure marks the feature as permanently blocked — report which features are blocked and how many cycles were attempted
