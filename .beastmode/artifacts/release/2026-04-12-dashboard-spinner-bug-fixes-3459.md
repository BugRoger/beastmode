---
phase: release
epic-id: dashboard-spinner-bug-fixes-3459
epic-slug: dashboard-spinner-bug-fixes-3459
bump: minor
---

# Release: Dashboard Spinner Bug Fixes

**Version:** v0.127.0
**Date:** 2026-04-12

## Highlights

Fix dashboard spinner palindrome animation (pulsing instead of rotating) and enable spinner display for design-phase epics. Extract shared spinner module to eliminate duplication between EpicsPanel and TreeView.

## Features

- Create shared spinner module with forward-only frame arrays, tick hook, and phase-based activation logic (`spinner.ts`)

## Fixes

- Use shared spinner module and phase-based `isActive()` activation in EpicsPanel — design-phase epics now show spinners

## Chores

- Refactor TreeView to use shared spinner module, remove local spinner definitions

## Full Changelog

- `277b22f6` feat(spinner): create shared spinner module with tests
- `68a78ec6` refactor(TreeView): use shared spinner module, remove local defs
- `9aa8e208` fix(EpicsPanel): use shared spinner module and phase-based activation
- `d4f5e095` implement(dashboard-spinner-bug-fixes-3459--spinner-shared-module-3459.1): checkpoint
- `5d8370da` validate(dashboard-spinner-bug-fixes-3459): checkpoint
