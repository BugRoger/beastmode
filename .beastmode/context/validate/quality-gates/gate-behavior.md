# Gate Behavior

## Context
Not all gate results are binary pass/fail. Some features pass with known non-critical issues that need documentation but should not block release.

## Decision
All gates must pass for release. Partial passes are acceptable for non-critical items but must be documented with impact assessment and recommendation. Known issues get severity classification (critical vs. non-critical) in the validation report.

## Rationale
The agents-to-beastmode migration passed with a partial on path references (bootstrap skills still referenced .agents/) — correctly classified as non-critical. Strict pass/fail on critical paths prevents regressions. Impact assessment on partials gives release phase the information to decide.

## Source
- .beastmode/artifacts/validate/2026-03-04-agents-to-beastmode-migration.md
