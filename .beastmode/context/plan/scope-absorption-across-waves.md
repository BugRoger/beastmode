# Scope Absorption Across Waves

**Context:** collision-proof-slugs dead-code-cleanup feature (2026-04-11)

**Problem:** Wave 3 feature (dead-code-cleanup) was implemented before wave 1 (slug-derivation) landed. The inline patch absorbed part of slug-derivation's scope, creating overlapping changes during reconciliation.

**Decision:** When wave ordering is violated, later-wave features MUST NOT absorb scope from earlier-wave features. Stub the dependency to compile, leave real implementation to the correct wave. Alternatively, enforce wave ordering strictly.

**Rationale:** The L0 rule about checking for pre-existing implementations describes the symptom (duplicate code at rebase), not the root cause (scope absorption from wave ordering violation).
