---
phase: plan
slug: collision-proof-slugs
epic: collision-proof-slugs
feature: prefix-resolution
wave: 1
---

# prefix-resolution

**Design:** `.beastmode/artifacts/design/2026-04-11-collision-proof-slugs.md`

## User Stories

2. As a CLI user, I want to type `beastmode plan dashboard-redesign` and have it resolve to `dashboard-redesign-f3a7` via prefix matching, so that I don't need to remember the hex suffix.
8. As the CLI resolver, I want prefix matching to only exist at the CLI entry point (`resolveIdentifier()` with opt-in flag), so that internal callers retain exact-match semantics and avoid accidental ambiguous resolution.

## What to Build

**Opt-in prefix matching:** Extend the store's identifier resolution function with an optional `allowPrefix` flag. When enabled, after exact ID and exact slug matching both fail, perform a prefix scan: find all epic slugs where `slug.startsWith(identifier + "-")`. If exactly one match, return it. If multiple matches, return an ambiguity error listing the matching slugs.

**Resolution chain:** The full chain becomes: (1) exact ID match, (2) exact slug match, (3) prefix slug match (only when opted in). The prefix match is safe because the ID suffix is random hex — a human-readable prefix can only collide with another epic that happens to share the same name prefix, which the ambiguity error handles.

**CLI entry points:** Only the phase command handler and cancel command handler pass the `allowPrefix` flag. All internal callers (reconcile, scan, fan-out, watch loop) retain exact-match semantics via the default behavior.

**Error messages:** When prefix matching finds multiple candidates, the error message should list all matching slugs so the user can provide a more specific identifier.

## Integration Test Scenarios

```gherkin
@collision-proof-slugs @cli
Feature: CLI prefix resolution -- human-readable prefix resolves to full slug

  CLI users can type the human-readable portion of an epic slug (e.g.,
  "dashboard-redesign") and have it resolve to the full collision-proof
  slug (e.g., "dashboard-redesign-f3a7"). This is opt-in at the CLI
  entry point only; internal callers retain exact-match semantics.

  Background:
    Given a store is initialized
    And an epic exists with slug "dashboard-redesign-f3a7"
    And an epic exists with slug "auth-system-b2c4"

  Scenario: Exact slug match takes priority over prefix match
    When the CLI resolves identifier "dashboard-redesign-f3a7"
    Then the resolution should return the epic with slug "dashboard-redesign-f3a7"

  Scenario: Prefix match resolves to full slug
    When the CLI resolves identifier "dashboard-redesign" with prefix matching enabled
    Then the resolution should return the epic with slug "dashboard-redesign-f3a7"

  Scenario: Prefix match works with partial name
    When the CLI resolves identifier "dashboard" with prefix matching enabled
    Then the resolution should return the epic with slug "dashboard-redesign-f3a7"

  Scenario: Ambiguous prefix match returns an error
    Given an epic exists with slug "dashboard-metrics-e5f6"
    When the CLI resolves identifier "dashboard" with prefix matching enabled
    Then the resolution should fail with an ambiguity error
    And the error should list both matching slugs

  Scenario: Exact entity ID match takes priority over prefix
    When the CLI resolves identifier "bm-f3a7" with prefix matching enabled
    Then the resolution should match by entity ID, not by prefix

  Scenario: Internal callers use exact match only
    When an internal caller resolves identifier "dashboard-redesign" without prefix matching
    Then the resolution should fail with a not-found error
    And no prefix expansion should be attempted
```

## Acceptance Criteria

- [ ] `resolveIdentifier()` accepts an `allowPrefix` option (default false)
- [ ] Resolution chain: exact ID → exact slug → prefix slug (when opted in)
- [ ] Single prefix match returns the matched entity
- [ ] Multiple prefix matches return an ambiguity error with all matching slugs listed
- [ ] No prefix match returns not-found (same as today)
- [ ] Only phase command and cancel command pass `allowPrefix: true`
- [ ] Internal callers (reconcile, scan, fan-out) retain exact-match-only semantics
- [ ] Prefix matching uses `startsWith(identifier + "-")` to avoid substring false positives
