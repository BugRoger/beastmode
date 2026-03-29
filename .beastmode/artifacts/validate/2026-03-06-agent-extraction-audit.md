# Validation Report

## Status: PASS

### Tests
Skipped -- pure markdown project, no test suite.

### Lint
Skipped -- no linter configured.

### Types
Skipped -- no type checker configured.

### Custom Gates (Acceptance Criteria)

| # | Criterion | Status |
|---|-----------|--------|
| 1 | All 6 agent prompts moved to `agents/` with correct names | PASS |
| 2 | `agents/researcher.md` renamed to `agents/common-researcher.md` | PASS |
| 3 | `agents/discovery.md` deleted | PASS |
| 4 | All `@import` paths in skills updated to new locations | PASS |
| 5 | `common-instructions.md` remains in `skills/beastmode/references/discovery-agents/` | PASS |
| 6 | `skills/plan/phases/0-prime.md` references `common-researcher.md` | PASS |
| 7 | No broken `@import` references remain | PASS |

### Summary

7/7 acceptance criteria pass. Zero old references remain. All new paths verified.
