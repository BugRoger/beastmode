# Release: cli-worktree-management

**Version:** v0.28.0
**Date:** 2026-03-29

## Highlights

CLI becomes the sole orchestrator for worktree lifecycle. `beastmode <phase> <slug>` replaces the Justfile + hook indirection with a single TypeScript entry point that owns creation, persistence, fan-out merge coordination, and release teardown.

## Features

- **Phase command** — New `beastmode <phase> <slug>` entry point replaces `beastmode run <phase> <slug>` and `just <phase> <slug>`. Phases are top-level commands.
- **Worktree lifecycle** — CLI owns the full lifecycle: create-once at first phase, persist through all phases, squash-merge to main and remove at release
- **Manifest module** — New `cli/src/manifest.ts` for reading and managing pipeline manifests from worktrees
- **Implement fan-out** — Per-feature worktrees with `<epic>-<feature>` slug convention. Merge-coordinator merges features to epic branch with conflict simulation for optimal ordering.
- **Release teardown** — CLI squash-merges epic feature branch to main, archives branch tip, removes worktree after release phase completes
- **Watch command updates** — Watch loop uses same worktree lifecycle as manual `beastmode <phase>`, ensuring identical behavior for automated and manual execution

## Chores

- **cli/dist gitignore** — Added `cli/dist` to `.gitignore`

## Full Changelog

Commits since v0.24.0 on feature branch:
- dd06bd2 chore: gitignore cli/dist
- 227f436 checkpoint: cli rewrite, pipeline state, and design artifacts
- 1b885eb design(cli-worktree-management): checkpoint
