---
phase: release
slug: slug-redesign
bump: minor
---

# Release: slug-redesign

**Bump:** minor
**Date:** 2026-04-01

## Highlights

Consolidates all slug lifecycle management into the manifest store with consistent terminology (slug = immutable hex, epic = human name, feature = sub-unit), standardized frontmatter across all phases, a single rename path, a single persist path, and output.json as the sole LLM-to-CLI communication channel.

## Features

- Standardized YAML frontmatter across all 5 phases with consistent `slug`, `epic`, `feature` fields
- `store.rename()` — single atomic method handling all 7 slug-keyed resources (artifacts, branch, worktree, manifest file, manifest content)
- `store.find()` — resolves epics by either hex slug or human-readable name
- `slugify()` and `isValidSlug()` — centralized format validation in the store
- Collision resolution using deterministic `<epic>-<hex>` suffix
- Single `store.save()` persist call per dispatch — no more multiple writes or mid-transaction divergence
- output.json as sole LLM-to-CLI communication channel (replaces commit-message regex)

## Chores

- Deleted `rename-slug.ts` — logic absorbed into `store.rename()`
- Deleted `resolveDesignSlug()` commit-message regex parser
- Deleted `skipFinalPersist` flag and coordination logic
- Removed disk writes from machine persist action
- Removed rename logic from `store.save()`

## Full Changelog

- `design(slug-redesign): checkpoint` — PRD with terminology, rename sequence, persist consolidation decisions
- `design(slug-redesign): add output.json for plan phase` — Design artifact for plan decomposition
- `plan(slug-redesign): checkpoint` — 4-feature decomposition (frontmatter-standard, store-rename, persist-consolidation, dispatch-cleanup)
- `implement(frontmatter-standard): checkpoint` — Epic field in frontmatter across phase artifacts
- `implement(store-rename): checkpoint` (x2) — store.rename(), store.find(), slugify(), isValidSlug()
- `implement(persist-consolidation): checkpoint` — Single persist path, manifest store API consolidation
- `implement(dispatch-cleanup): checkpoint` — Standardized slug resolution in watch dispatch
- `validate(slug-redesign): checkpoint` — Types clean, +167 pass, -10 fail, -3 errors vs main
