# Testing

## Brownfield Verification
- ALWAYS verify L2 files contain project-specific content, not placeholders — real data only
- ALWAYS check: populated sections, actual file paths, real patterns from codebase — completeness
- NEVER accept generic content — every L2 entry should reference actual project artifacts
- Success criteria: all context L2 files populated after `init --brownfield` — no placeholder patterns remaining

## Critical Paths
- ALWAYS test brownfield on a real codebase before release — integration validation
- ALWAYS verify parallel agents produce non-conflicting output — concurrency safety
- ALWAYS verify atomic writes — no partial file states
- Core scenarios: brownfield execution, parallel agent spawning, content merge, atomic file writes — full coverage

## Test Runner
- ALWAYS import test utilities from `vitest` in new test files — project uses vitest as the test framework with Bun as the runtime (`bun --bun vitest run`); 112 test files use vitest imports, zero use bun:test

context/implement/testing/bun-test-runner-imports.md

## BDD Integration Tests (Cucumber)
- ALWAYS use source-analysis World pattern for Ink/React terminal UI component tests — no component rendering, pure source string parsing and runtime function calls
- ALWAYS use store-lifecycle World pattern for CRUD-backed store interface tests — TaskStore instance in World, reset via Before/After hooks, per-scenario isolation
- ALWAYS create a dedicated cucumber profile per domain in `cucumber.json` — explicit import list (world, hooks, steps), isolated from other profiles
- ALWAYS write intentionally-failing scenarios first (wave 1) before the implementation that fixes them (wave 2) — BDD verifies the wiring bug, then the fix

- ALWAYS use API-behavioral World pattern for module contract tests (interface shape, delegation, data routing) — inject mock dependency at World construction, capture calls for Then-step assertions

context/implement/testing/cucumber-source-analysis-world.md
context/implement/testing/cucumber-store-lifecycle-world.md
context/implement/testing/cucumber-api-behavioral-world.md

## Git-Initialized Temp Dirs for CLI Hook Tests
- ALWAYS call `git init` in temp dirs used by integration tests that invoke CLI dispatch commands — hook handlers (hitl-auto, hitl-log, generate-output) call `git rev-parse --show-toplevel` internally; a plain `mkdtempSync` dir causes the command to fail with "not a git repository"
- Applies to any test that shells out to `bun run src/index.ts hooks <name>` or `bunx beastmode hooks <name>`

context/implement/testing/git-initialized-temp-dirs.md
