# Consumer Test Migration for Derivation Contract Changes

**Context:** collision-proof-slugs slug-derivation and validate phases (2026-04-11)

**Problem:** Changing slug derivation from user-provided to auto-derived broke 69 tests across 9 files that hardcoded old-format slugs. All were consumer-side assertions, not tests of the changed module.

**Decision:** When a feature changes a derivation contract (explicit value becomes auto-derived), the plan MUST include a consumer test fixup task. Use grep for the old assertion pattern across all test files at plan time.

**Rationale:** The slug-derivation plan listed type changes but did not scope consumer test migration. Validate phase absorbed the work (9 test files). Consumer test fixup should be scoped at plan time.
