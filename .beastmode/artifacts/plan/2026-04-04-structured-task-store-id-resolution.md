---
phase: plan
slug: structured-task-store
epic: structured-task-store
feature: id-resolution
wave: 3
---

# ID Resolution

**Design:** `.beastmode/artifacts/design/2026-04-04-structured-task-store.md`

## User Stories

5. As a **developer**, I want to reference epics by either hash ID (`bm-a3f8`) or human slug (`cli-restructure`) in all phase commands, so that I can use whichever is more convenient.

## What to Build

Dual ID/slug resolution layer for phase commands. When a developer runs `beastmode plan bm-a3f8` or `beastmode plan cli-restructure`, both resolve to the same epic.

**Resolution Strategy:**
Three-step lookup in phase command paths:
1. Try as entity ID — exact match on `bm-xxxx` pattern in the store
2. Try as slug — match on entity's `slug` field in the store
3. Fallback to current manifest lookup (during coexistence period)

The resolution module sits between argument parsing and phase dispatch. It normalizes the identifier to a canonical slug that the rest of the pipeline understands.

**Coexistence Handling:**
During the PRD-1 coexistence period, the store may not have all epics (only those created after the store was introduced). The manifest fallback ensures existing epics still work. When an epic exists in both store and manifest, the store takes precedence.

**Edge Cases:**
- Ambiguous reference: if an identifier matches both an ID and a slug of different entities, return an error suggesting the fully qualified identifier
- Missing entity: if no match in store or manifest, return the current error behavior
- Feature IDs (`bm-xxxx.n`): resolve to the parent epic for phase commands (phase commands operate on epics, not individual features)

## Acceptance Criteria

- [ ] `beastmode plan bm-a3f8` resolves to the epic with that hash ID
- [ ] `beastmode plan cli-restructure` resolves to the epic with that slug
- [ ] Fallback to manifest lookup when entity not in store
- [ ] Ambiguous references produce a descriptive error
- [ ] Feature IDs in phase commands resolve to the parent epic
- [ ] All existing phase commands continue to work with slug-only identifiers (no regression)
