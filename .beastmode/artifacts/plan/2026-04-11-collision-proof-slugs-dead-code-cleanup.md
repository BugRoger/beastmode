---
phase: plan
slug: collision-proof-slugs
epic: collision-proof-slugs
feature: dead-code-cleanup
wave: 3
---

# dead-code-cleanup

**Design:** `.beastmode/artifacts/design/2026-04-11-collision-proof-slugs.md`

## User Stories

7. As a developer, I want `deduplicateSlug()`, `hashId()`, and `collectSlugs()` deleted, so that the dead code doesn't mislead future contributors.

## What to Build

**Remove dead functions from slug module:** Delete `deduplicateSlug()` and `hashId()` from the slug utility module. These functions are structurally unreachable after wave 1 changes — `addFeature()` no longer calls deduplication, and the new ordinal-based slug derivation makes hash-based deduplication unnecessary.

**Remove dead method from store:** Delete the `collectSlugs()` private method from the in-memory store implementation. It was only called by `addFeature()` as part of the deduplication flow, which wave 1 replaces with ordinal derivation.

**Remove exports:** Clean up any re-exports of the deleted functions from module barrel files or public interfaces.

**Verify unreachability:** Before deletion, grep the entire codebase for any remaining references to these three functions. If any callers remain (indicating an incomplete wave 1 implementation), this feature cannot proceed — it is blocked until all callers are migrated.

## Integration Test Scenarios

<!-- No behavioral scenarios -- skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] `deduplicateSlug()` is deleted from the slug module
- [ ] `hashId()` is deleted from the slug module
- [ ] `collectSlugs()` is deleted from the in-memory store implementation
- [ ] No remaining imports or references to these three functions anywhere in the codebase
- [ ] All existing tests still pass (no test depends on the deleted functions)
- [ ] Module exports are cleaned up (no dangling re-exports)
