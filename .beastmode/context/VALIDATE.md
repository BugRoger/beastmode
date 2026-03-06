# Validate Context

Quality gates and verification strategy before release. The /validate skill runs project-specific checks (tests, lint, type checks) and requires user approval before proceeding to release.

## Quality Gates
Quality gate definitions — criteria, thresholds, and pass/fail rules for the validate phase. Gates emerge as formal definitions beyond manual verification.

1. ALWAYS run all project-specific checks (tests, lint, type checks) before release
2. NEVER proceed to release with failing quality gates
