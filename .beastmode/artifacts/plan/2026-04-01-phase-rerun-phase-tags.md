---
phase: plan
slug: phase-rerun
epic: phase-rerun
feature: phase-tags
wave: 1
---

# Phase Tags

**Design:** .beastmode/artifacts/design/2026-04-01-phase-rerun.md

## User Stories

1. As a user, I want git tags to mark each phase checkpoint, so that regression has deterministic reset targets independent of commit message formatting.

## What to Build

A tag management module that provides create, delete, list, and rename operations for phase checkpoint tags. Tags follow the naming convention `beastmode/<slug>/<phase>`.

**Tag creation** hooks into post-dispatch: after every successful phase completion, the module creates a tag pointing at the current branch HEAD. If a tag for that phase already exists (same-phase rerun), it is overwritten.

**Tag deletion** supports regression: given a target phase, delete all tags for phases that come after it in the phase ordering. This is called during regression before git reset.

**Tag rename** integrates with the existing slug rename flow: when an epic's hex slug is renamed to a human-readable slug, all `beastmode/<hex>/<phase>` tags are renamed to `beastmode/<epic>/<phase>`.

**Graceful degradation**: all tag operations use allowFailure semantics. Missing tags log a warning but never crash the workflow. This handles old epics created before the feature existed.

## Acceptance Criteria

- [ ] Tags created at `beastmode/<slug>/<phase>` after each successful phase dispatch
- [ ] Existing tag for same phase is overwritten on rerun
- [ ] Tags for all phases after a target phase are deleted during regression
- [ ] Tags renamed from hex slug to epic slug during store.rename()
- [ ] Missing or duplicate tags handled gracefully (warning, no crash)
- [ ] Tag namespace `beastmode/` avoids collision with user-created tags
