# Quality Gates

## Standard Gates
- ALWAYS attempt standard gates even if expected to skip — tests, lint, type checks
- ALWAYS annotate skipped gates with rationale in the validation report — transparency
- NEVER treat skipped gates as failures — they are not-applicable, not broken
- For markdown-only projects, standard gates are skipped and custom gates carry the full validation burden — context-appropriate
- For code projects, standard gates run alongside custom gates — both carry validation burden together

## Custom Gate Types
- ALWAYS define custom gates from the feature's acceptance criteria — design traceability
- ALWAYS verify structural changes with file existence checks — structural integrity
- ALWAYS scan for stale references after migration or rename operations — prevents dead links
- Six established types: acceptance criteria, structural integrity, stale reference detection, cross-reference validation, content correctness, regression checks — proven taxonomy
- Acceptance criteria is dominant gate type, used in 90%+ of reports — primary verification method

## Gate Behavior
- NEVER proceed to release with critical gate failures — quality enforcement
- ALWAYS document partial passes with impact assessment — risk awareness
- ALWAYS capture known issues with severity and recommendation — actionable reporting

## Manual Verification
- ALWAYS verify skill invocation produces expected artifacts — functional check
- ALWAYS check context files for placeholder patterns — content quality
- ALWAYS mark deferred checks as DEFER with follow-up context — honest status
- NEVER release without running validate phase — mandatory quality step
