---
phase: release
slug: manifest-absorption
epic: manifest-absorption
bump: minor
---

# Release: manifest-absorption

**Bump:** minor
**Date:** 2026-04-05

## Highlights

Absorbs the manifest module into the store, making the JSON file store the single source of truth for all pipeline state. Eliminates dual-write reconciliation between manifest and store by migrating all consumers, bridging XState to store types, separating GitHub sync into its own I/O layer, and deleting the manifest module entirely.

## Features

- Store schema extension: add Feature.slug, EnrichedEpic, NextAction, summary object shape, slug utilities
- Store import command with manifest migration path
- GitHub sync separation: sync-refs I/O module, rewrite runner/early-issues/syncGitHub to use store entities
- XState-store bridge: rewrite pipeline machine types, guards, actions, and reconciler for store entity types
- Consumer migration: migrate dashboard, watch loop, phase command, cancel, and backfill to store-only
- Manifest deletion: remove manifest module, migrate all remaining references

## Fixes

- Store: remove duplicate step defs, add epic slug immutability, fix cucumber profile
- GitHub sync separation: fix type errors, rewrite early-issues + sync-helper tests for store-based API
- XState-store bridge: fix remaining type errors in pipeline-machine
- Consumer migration: use listEnrichedFromStore in dashboard
- Manifest deletion: clean up manifest references and fix integration test
- Validation: fix reconciler slug rename, feature status sync, reDispatchCount persistence, worktree rename after slug change

## Chores

- Delete backfill script (moved to store module)
- Delete backfill enrichment test (covered by store integration tests)

## Full Changelog

- `design(manifest-absorption): checkpoint`
- `plan(manifest-absorption): checkpoint`
- Store schema extension (6 commits): slug field, EnrichedEpic types, slug utilities, BDD integration test
- Store import (3 commits): import command, manifest migration, integration test
- GitHub sync separation (9 commits): sync-refs module, rewrite sync consumers, fix type errors, integration test
- XState-store bridge (10 commits): rewrite types/guards/actions/reconciler, inline regress, fix type errors, integration test
- Consumer migration (12 commits): migrate dashboard/watch-loop/phase-command/cancel/backfill, re-export types, integration tests
- Manifest deletion (7 commits): delete manifest module, migrate references, clean up tests, integration test
- Validation checkpoint (1 commit): integration test fixes, reconciler fixes, type error cleanup
