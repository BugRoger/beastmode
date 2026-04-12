---
phase: release
epic-id: lockfile-path-fix-dcd0
epic-slug: lockfile-path-fix-dcd0
bump: patch
---

# Release: lockfile-path-fix-dcd0

**Bump:** patch
**Date:** 2026-04-12

## Highlights

Fixes ENOENT error when starting the dashboard from a worktree by moving the watch loop lockfile from `cli/` to the project-rooted `.beastmode/` directory.

## Fixes

- Resolve lockfile path to `.beastmode/.beastmode-watch.lock` instead of `cli/.beastmode-watch.lock`
- Update `.gitignore` entry to match new lockfile path

## Docs

- Update lockfile path references in `context/design/orchestration.md` and `context/design/cli.md`

## Full Changelog

- `8ba83c61` fix(lockfile): resolve lockfile path to .beastmode/ instead of cli/
- `e4876797` fix(gitignore): update lockfile entry to match new .beastmode/ path
- `6a4bcb9a` docs: update lockfile path references in context docs
- `cacdd19c` implement(lockfile-path-fix-dcd0): checkpoint
- `5f49351b` validate(lockfile-path-fix-dcd0): checkpoint
- `64dcf079` plan(lockfile-path-fix-dcd0): checkpoint
- `c076f7ed` design(lockfile-path-fix-dcd0): checkpoint
