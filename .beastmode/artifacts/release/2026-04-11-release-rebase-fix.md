---
phase: release
slug: release-rebase-fix
epic: release-rebase-fix
bump: minor
---

# Release: release-rebase-fix

**Version:** v0.107.0
**Date:** 2026-04-11

## Highlights

Adds a rebase step before squash merge during release, ensuring the feature branch is current with main before merging. Removes the dead `merge()` function from worktree utilities.

## Features

- Rebase feature branch onto main before squash merge during release (`feat(release)`)

## Chores

- Remove dead `merge()` function from worktree utilities (`refactor(worktree)`)

## Full Changelog

- `7bdaa62f` feat(release): rebase feature branch onto main before squash merge
- `105f8dd5` refactor(worktree): remove dead merge() function
- `9d27fd5b` implement(release-rebase-fix-remove-dead-merge): checkpoint
- `6a53a906` implement(release-rebase-fix-rebase-before-squash): checkpoint
- `bc8d4045` plan(release-rebase-fix): checkpoint
- `f564a382` plan(release-rebase-fix): checkpoint
- `7eec07ec` design(release-rebase-fix): checkpoint
- `b6d59d49` validate(release-rebase-fix): checkpoint
