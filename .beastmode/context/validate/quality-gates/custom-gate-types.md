# Custom Gate Types

## Context
Standard gates (tests, lint, types) are not applicable for markdown-only projects. The validate phase needed concrete validation mechanisms for structural and content correctness.

## Decision
Six custom gate types established through practice: acceptance criteria (design doc verification), structural integrity (file/directory existence), stale reference detection (grep scans for deprecated patterns), cross-reference validation (skill file consistency), content correctness (format and logic checks), and regression checks (only expected files changed).

## Rationale
- Acceptance criteria gates tie validation directly to design decisions (used in 90%+ of reports)
- Stale reference detection catches migration debris (proven in agents-to-beastmode, remove-agents-refs)
- Cross-reference validation catches broken skill chains (proven in implement-v2, plan-skill-improvements)
- Regression checks prevent unintended side effects (proven in release-retro-commit, release-version-sync)

## Source
- .beastmode/artifacts/validate/2026-03-04-hitl-gate-config.md
- .beastmode/artifacts/validate/2026-03-04-agents-to-beastmode-migration.md
- .beastmode/artifacts/validate/2026-03-04-implement-v2.md
- .beastmode/artifacts/validate/2026-03-05-dynamic-retro-walkers.md
- .beastmode/artifacts/validate/2026-03-06-retro-reconciliation.md
