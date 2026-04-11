---
phase: release
slug: slug-id-consistency-4e3a
epic: slug-id-consistency-4e3a
bump: minor
---

# Release: slug-id-consistency-4e3a

**Bump:** minor
**Date:** 2026-04-11

## Highlights

Eliminates slug/ID ambiguity across the entire pipeline. Environment variables, frontmatter, reconcile functions, store lookups, and mutex keys now use entity IDs exclusively. The generic `store.find()` is removed in favor of typed `getEpic()`/`getFeature()` accessors.

## Features

- Replace `BEASTMODE_SLUG` with `BEASTMODE_ID` in hook environment variables
- Replace `fm.slug` with `fm.id` in frontmatter contract
- Update all call sites for the id parameter contract change
- Embed parent epic name in feature slugs with `--` separator
- Deduplicate slugify, replace randomHex with placeholder names
- Add placeholder name generator for human-readable feature slugs
- Accept dots in slug validation

## Fixes

- Fix remaining `store.find()` references missed by agent dispatch
- Fix BDD step definition parameter binding for slug-foundation tests
- Replace `toEndWith` with `toMatch` for type safety in slug-foundation tests
- Update tests for new feature slug format and slugify dedup

## Chores

- Replace slug params with epicId in all 6 reconcile functions, use getEpic instead of find
- Replace `store.find(slug)` with epicId lookup in pipeline runner, add fallback resolution
- Remove `find()` method from TaskStore interface and implementations
- Use `resolveIdentifier` instead of `store.find()` in store commands
- Update pipeline-runner mock from `find()` to `getEpic()` and add `listEpics()`
- Remove `find()` usage from all test files

## Full Changelog

- ec99c57f design(slug-id-consistency): checkpoint (#505)
- a3661038 plan(slug-id-consistency): checkpoint (#505)
- d3679f60 feat(env-frontmatter-contract): replace BEASTMODE_SLUG with BEASTMODE_ID in hook env vars
- 7d58d539 feat(env-frontmatter-contract): replace fm.slug with fm.id in frontmatter contract
- ffeca631 test(slug-foundation): add BDD integration test (RED)
- 409ce772 feat(slug-foundation): accept dots in slug validation
- 59f2a353 feat(slug-foundation): add placeholder name generator
- b760785f test(env-frontmatter-contract): update tests for id/slug contract change
- 2d51aa4d feat(env-frontmatter-contract): update call sites for id parameter
- 9dc763b0 test(slug-foundation): add -- separator guarantee tests
- 32f1cdad test(env-frontmatter-contract): update integration test for id parameter
- e8750427 implement(slug-id-consistency-4e3a-env-frontmatter-contract): checkpoint
- d0838d78 feat(slug-foundation): embed parent epic name in feature slugs with -- separator
- a37686f2 feat(slug-foundation): deduplicate slugify, replace randomHex with placeholder names
- e6dcf19e fix(slug-foundation): update tests for new feature slug format and slugify dedup
- 22bef1a7 fix(slug-foundation): fix BDD step definition parameter binding
- fc0c2ded fix(slug-foundation): replace toEndWith with toMatch for type safety
- ad465732 implement(slug-id-consistency-slug-foundation): checkpoint
- 81a70fd8 test(id-pipeline): add BDD integration test for ID-based store lookups
- 36c74df3 refactor(reconcile): replace slug params with epicId, use getEpic instead of find
- fc10be50 refactor(runner): replace store.find(slug) with epicId lookup, add fallback resolution
- bc002dbb test(pipeline-runner): update mock from find() to getEpic() and add listEpics()
- d21de4ad refactor(store): remove find() method from TaskStore interface and implementations
- e7af2028 test(store): remove find() usage from test files, use getEpic() and listEpics()
- 1ca1cc77 refactor(store-commands): use resolveIdentifier instead of store.find()
- 0f992467 fix(id-pipeline): fix remaining store.find() references missed by agent dispatch
- b444d7e1 implement(slug-id-consistency-4e3a-id-pipeline): checkpoint
- cb2895e5 validate(slug-id-consistency-4e3a): checkpoint
