---
phase: release
slug: collision-proof-slugs
epic: collision-proof-slugs
bump: minor
---

# Release: collision-proof-slugs

**Version:** v0.111.0
**Date:** 2026-04-11

## Highlights

Epic and feature slugs now embed unique ID suffixes, making slug collisions structurally impossible. CLI users can type the human-readable prefix and have it resolve to the full slug via opt-in prefix matching.

## Features

- Derive epic slugs as `slugify(name)-{4-hex-chars}` from entity ID, making them collision-proof
- Derive feature slugs as `slugify(name)-{ordinal}` from feature ID suffix, replacing hash-based deduplication
- Add opt-in prefix matching to `resolveIdentifier()` for CLI ergonomics (exact match still takes priority)
- Wire `allowPrefix` into `phaseCommand()` and `cancelEpic()` CLI entry points
- Rewrite `reconcileDesign()` to update slug in-place via `updateEpic()`, preserving entity ID stability
- Rename git tags from old slug to new slug during design reconciliation
- Remove slug immutability guard from `updateEpic()` to enable design-phase slug mutation
- Delete dead code: `hashId()`, `deduplicateSlug()`, and `collectSlugs()`

## Fixes

- Restore `slug?` optional parameter in store signatures for backward compatibility with old-format slugs
- Rename design artifact to match epic name convention

## Full Changelog

- `01f5cc3e` design(collision-proof-slugs): checkpoint
- `2b65070f` fix(collision-proof-slugs): rename design artifact to match epic name convention
- `43405068` plan(collision-proof-slugs): checkpoint
- `f9e5c33e` test(prefix-resolution): add integration test for prefix matching (RED)
- `d298411c` test(slug-derivation): add integration tests for collision-proof slug derivation (RED)
- `ee4c9fef` test(reconcile-in-place): add integration tests for entity ID stability (RED)
- `8efe7e4d` feat(reconcile-in-place): remove slug immutability guard from updateEpic
- `7c8b889c` feat(slug-derivation): derive epic slugs from ID suffix, feature slugs from ordinal
- `6dc51cff` feat(slug-derivation): update JsonFileStore delegate to match new interface
- `80e2ef87` test(slug-derivation): update store tests for auto-derived slug format
- `9f68fe2c` feat(reconcile-in-place): rewrite reconcileDesign to update slug in-place with renameTags
- `76859bdc` feat(reconcile-in-place): rewrite reconcileDesign to update slug in-place
- `1c345946` implement(collision-proof-slugs-reconcile-in-place): checkpoint
- `79dd4c98` feat(prefix-resolution): add opt-in prefix matching to resolveIdentifier()
- `ee9c1fdd` feat(prefix-resolution): wire allowPrefix into phaseCommand and cancelEpic
- `4ec3a963` implement(collision-proof-slugs-prefix-resolution): checkpoint
- `5b562f96` fix(collision-proof-slugs): restore slug? in signatures for backward compat
- `8cdb6fe5` implement(collision-proof-slugs-slug-derivation): checkpoint
- `2558681d` feat(dead-code-cleanup): delete hashId() and deduplicateSlug() from slug module
- `88e84877` feat(dead-code-cleanup): remove collectSlugs() and patch addFeature() to ordinal slugs
- `361e6802` feat(dead-code-cleanup): remove deduplicateSlug tests
- `08b96e04` implement(collision-proof-slugs-dead-code-cleanup): checkpoint
- `3c2e87f4` validate(collision-proof-slugs): checkpoint
