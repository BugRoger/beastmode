---
phase: plan
slug: fe70d5
epic: file-permission-hooks
feature: integration-tests
wave: 1
---

# Integration Tests

**Design:** .beastmode/artifacts/design/2026-04-04-fe70d5.md

## User Stories

1. As a user, I want a `file-permissions:` config section in `config.yaml` with category-based prose so that I can control how file permission dialogs are handled without per-phase configuration.
2. As a user, I want Claude Code's permission dialog for `.claude/` file writes to be interceptable by a prompt hook so that the pipeline can auto-allow or auto-deny based on my prose instructions.
3. As a user, I want file permission decisions logged alongside HITL decisions so that retro can surface patterns and suggest config evolution.

## What to Build

Behavioral integration specs covering the full file-permission-hooks epic, written as Gherkin `.feature` files with corresponding step definitions and test runner configuration.

The integration artifact at `.beastmode/artifacts/plan/2026-04-04-file-permission-hooks-integration.md` contains 12 Gherkin scenarios organized into 4 feature blocks:

1. **Config section parsing** (3 scenarios) — config loading, default fallback, category-vs-phase semantics
2. **Hook generation with if-field filtering** (4 scenarios) — Write/Edit matchers, if-conditions, HITL coexistence, cleanup, settings preservation
3. **Decision logging** (3 scenarios) — PostToolUse hook presence, log entry structure, coexistence with HITL entries
4. **End-to-end lifecycle** (2 scenarios) — cross-phase prose persistence, dispatch failure safety

Step definitions extend the existing Cucumber step definition infrastructure. New steps needed for file-permission-specific assertions (hook matchers, if-conditions, log entry format).

## Acceptance Criteria

- [ ] All 12 Gherkin scenarios from the integration artifact are implemented as `.feature` files
- [ ] Step definitions compile and are wired to the Cucumber test runner
- [ ] New step definitions follow existing patterns from the HITL hook lifecycle feature
- [ ] All scenarios initially fail (red) since the production code does not exist yet
