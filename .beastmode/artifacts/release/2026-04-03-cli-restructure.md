---
phase: release
slug: cli-restructure
epic: cli-restructure
bump: minor
---

# Release: cli-restructure

**Version:** v0.71.0
**Date:** 2026-04-03

## Highlights

Unifies manual CLI and watch loop dispatch into a single pipeline runner, adds automatic worktree rebase before each phase, restructures CLI source into domain directories with uniform naming, and removes dead code.

## Features

- Unified pipeline runner (`pipeline/runner.ts`) called by both manual CLI and watch loop — eliminates duplicated worktree setup, dispatch, reconciliation, and teardown logic
- Worktree rebase step before each phase dispatch (except design) — prevents merge distance accumulation across multi-phase workflows
- Domain directory restructure — seven domain directories (`git/`, `hooks/`, `dispatch/`, `pipeline/`, `settings/`, `artifacts/`, `manifest/`) with uniform CRUD verb naming

## Chores

- Dead code removal — unused exports, orphan modules, and stale files cleaned up

## Full Changelog

- `eb917a8` design(cli-restructure): checkpoint
- `7e23fc6` design(cli-restructure): checkpoint
- `43a5fd7` plan(cli-restructure): checkpoint
- `22923d3` implement(cli-restructure-dead-code-removal): checkpoint
- `d99d4e7` implement(cli-restructure-domain-restructure): checkpoint
- `cf4ca97` implement(cli-restructure-rebase-step): checkpoint
- `7ab36ae` implement(cli-restructure-unified-pipeline): checkpoint
- `27d477c` validate(cli-restructure): checkpoint
