# Release: typescript-pipeline-orchestrator

**Version:** v0.25.0
**Date:** 2026-03-28

## Highlights

TypeScript CLI (`beastmode`) built with Bun and the Claude Agent SDK replaces the Justfile orchestrator with manual phase execution (`beastmode run`) and autonomous multi-epic pipeline orchestration (`beastmode watch`). External worktree lifecycle management, parallel feature dispatch, pre-merge conflict simulation, and cost tracking.

## Features

- **CLI scaffold** — Bun-native TypeScript CLI with `run`, `watch`, and `status` commands, argument parsing, and config loading from `.beastmode/config.yaml`
- **Worktree manager** — CLI-owned worktree lifecycle: create with `feature/<slug>` branch detection, cleanup on completion, TypeScript rewrite of `worktree-create.sh`
- **Run command** — Single-phase execution via Claude Agent SDK `query()` with streaming output, worktree isolation, and `permissionMode: bypassPermissions`
- **State scanner** — Manifest-based state scanning to derive next actions per epic, detect phase completion, and identify human gates
- **Watch loop** — Autonomous pipeline: 60-second poll with event-driven re-scan on session completion, parallel epic dispatch, human gate pause with stdout notification
- **Merge coordinator** — Pre-merge conflict simulation via `git merge-tree`, optimized merge ordering, sequential merge execution, dedicated Claude session for conflict resolution
- **Status command** — Fast TypeScript state scan showing epic state, feature progress, and cost-to-date without spawning Claude

## Fixes

- Removed accidentally staged worktree directory
- Fixed unused `targetBranch` destructuring in merge coordinator

## Chores

- Added `cli/.gitignore`, removed tracked `node_modules`

## Full Changelog

- `design(orchestrator): checkpoint` — Initial orchestrator design exploration
- `design(typescript-pipeline-orchestrator): checkpoint` — Full PRD with implementation decisions
- `plan(typescript-pipeline-orchestrator): checkpoint` — 7 feature plans decomposed
- `validate(typescript-pipeline-orchestrator): checkpoint` — 85 tests, 0 failures, types clean
- `chore: add cli/.gitignore, remove tracked node_modules`
- `fix: remove accidentally staged worktree`
