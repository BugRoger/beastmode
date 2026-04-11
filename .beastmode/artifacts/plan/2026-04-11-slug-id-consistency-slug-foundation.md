---
phase: plan
slug: ceceec
epic: slug-id-consistency-4e3a
feature: slug-foundation
wave: 1
---

# Slug Foundation

**Design:** `.beastmode/artifacts/design/2026-04-11-ceceec.md`

## User Stories

4. As a developer, I want a direct bijection between IDs and slugs via the hex suffix, so that I can mentally convert between them without a store lookup.
5. As a user, I want design-phase epics to have memorable placeholder names instead of hex strings, so that worktree directories and branch names are human-friendly from the start.
9. As a developer, I want `slugify()` deduplicated to a single import from `store/slug.ts`, so that slug formatting is consistent everywhere.
10. As a developer, I want slug validation to allow dots (for feature ID suffixes like `.2`), so that feature slugs pass validation.

## What to Build

### Slug Validation (dots)

The slug validation regex must be updated to accept dots. The current pattern `/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/` rejects dots, but feature IDs contain `.N` ordinal suffixes (e.g., `auth-flow-a3f2.2`). Update the validation to accept dots within the slug body while preserving the existing kebab-case constraints.

### Slugify Deduplication

Two `slugify()` functions exist: one in the store slug module and a duplicate in the phase command module. The phase command's copy must be removed and all consumers must import from the canonical store slug module. The canonical version should be the one in the store module — it is the authoritative slug-formatting function.

### Feature Slug Format

Feature slugs must embed the parent epic name using a `--` double-hyphen separator: `{epic-name}--{feature-name}-{4hex}.{ordinal}`. The `--` separator is unambiguous because `slugify()` collapses consecutive hyphens, making `--` impossible within epic or feature names.

The feature slug derivation in the in-memory store must be updated:
- Current: `slugify(name) + "-" + ordinal`
- New: `{epicSlug}--{slugify(name)}-{4hex}.{ordinal}`

Where `{epicSlug}` is the parent epic's slug (already collision-proof with hex suffix) and `{4hex}` is the first 4 hex chars of the entity ID.

### Placeholder Name Generator

A new module provides Docker-style placeholder names for design-phase epics. Format: `{adjective}-{noun}-{4hex}`. Uses a curated word list (~50 adjectives, ~50 nouns) for ~2,500 combinations.

The phase command's `randomHex()` function for design-phase slug generation must be replaced with the placeholder name generator. The `randomHex()` function can be removed entirely — IDs use the store's internal hex generation, and design slugs use placeholder names.

## Integration Test Scenarios

```gherkin
@slug-id-consistency @store
Feature: Slug-ID bijection -- hex suffix encodes entity ID

  The hex suffix appended to every slug is derived from the entity's
  hash ID. A developer can mentally extract the suffix to determine
  the ID without a store lookup, and vice versa. This bijection is
  the structural guarantee that makes slugs collision-proof.

  Background:
    Given a store is initialized

  Scenario: Epic slug suffix matches the entity's short ID
    When a developer creates an epic named "auth system"
    Then the epic slug suffix should equal the first characters of the entity's hash ID
    And the entity should be retrievable by extracting the suffix from the slug

  Scenario: Entity ID is recoverable from the slug alone
    Given an epic exists with a known slug and hash ID
    When a developer extracts the hex suffix from the slug
    Then the extracted suffix should match the entity's short ID
    And the entity should be locatable by that short ID without a store query

  Scenario: Bijection holds across multiple epics
    When a developer creates epics named "auth system" and "data pipeline"
    Then each epic's slug suffix should match its own short ID
    And no two epics should share the same suffix
```

```gherkin
@slug-id-consistency @store
Feature: Design-phase placeholder names -- human-friendly from the start

  Epics created during the design phase receive a memorable placeholder
  name instead of a raw hex string. Worktree directories and branch
  names are human-readable immediately, not just after design rename.

  Scenario: New epic receives a memorable placeholder name
    When a developer seeds an epic for the design phase
    Then the epic slug should contain a human-readable word
    And the epic slug should not be a bare hex string

  Scenario: Placeholder name appears in worktree directory
    When a developer seeds an epic for the design phase
    Then the worktree directory name should contain the placeholder slug
    And the directory name should be human-readable

  Scenario: Placeholder name appears in git branch
    When a developer seeds an epic for the design phase
    Then the git branch name should contain the placeholder slug
    And the branch name should not contain a bare hex string
```

```gherkin
@slug-id-consistency @store
Feature: Slugify deduplication -- single canonical import

  All slug formatting flows through a single slugify function imported
  from one canonical module. No duplicate slug-formatting logic exists
  elsewhere in the codebase.

  Scenario: Slug formatting produces consistent output regardless of call site
    Given a raw name "My Epic Name!"
    When the slug is computed by the store module
    And the slug is computed by any other consumer
    Then both results should be identical

  Scenario: Slug validation accepts dots for feature ID suffixes
    Given a feature slug containing a dot suffix like "auth-flow.2"
    When the slug is validated
    Then the validation should pass
    And the slug should be accepted by all slug-consuming APIs
```

## Acceptance Criteria

- [ ] `isValidSlug("auth-flow.2")` returns `true`
- [ ] Single `slugify()` export from `store/slug.ts`; no duplicates in `commands/phase.ts`
- [ ] `randomHex()` removed from `commands/phase.ts`
- [ ] Design-phase epics receive placeholder names matching `{adj}-{noun}-{4hex}` pattern
- [ ] Feature slugs follow `{epic-name}--{feature-name}-{4hex}.{ordinal}` format
- [ ] `--` separator is unambiguous: `slugify("foo--bar")` produces `foo-bar` (single hyphen)
- [ ] Grep: zero matches for `randomHex` outside of tests
- [ ] Grep: only one `export function slugify` in the codebase (in `store/slug.ts`)
