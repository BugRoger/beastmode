# Quality Gates

Quality gate definitions for the validate phase. Gates define criteria, thresholds, and pass/fail rules that must be satisfied before release. Currently emergent — formal gate definitions added as the project matures.

## Gate Criteria
Project-specific checks: tests, lint, type checks. Each gate has a pass/fail threshold. All gates must pass before proceeding to release.

1. ALWAYS run all configured quality checks before release
2. NEVER proceed to release with any failing gate
3. Gate definitions are project-specific — discovered during init or added manually

## Manual Verification
Current gates are manual — invoke skills and verify behavior. Automated gates will be added as patterns stabilize.

1. ALWAYS verify skill invocation produces expected artifacts
2. ALWAYS check context files for placeholder patterns
3. NEVER release without running validate phase
