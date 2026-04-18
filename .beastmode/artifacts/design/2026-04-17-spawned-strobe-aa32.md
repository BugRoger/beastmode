---
phase: design
epic-id: bm-aa32
epic-slug: spawned-strobe-aa32
epic-name: Gitignore State Protection
---

## Problem Statement

When beastmode is installed in a new project, the `.beastmode/state/` directory has no gitignore protection. Runtime state files (store.json, dashboard stats, sync caches, lock files) can be committed to version control. When another developer pulls these committed state files, they overwrite local runtime state, causing data loss.

## Solution

Add a `.beastmode/.gitignore` file to the skeleton assets that ships with every new installation. The gitignore ignores all transient files — the `state/` directory contents, lock files, and cache files — while preserving the empty directory structure via `.gitkeep` negation rules.

## User Stories

1. As a developer installing beastmode in a new project, I want the state directory to be automatically gitignored, so that runtime state files are never committed by accident.
2. As a developer working on a beastmode-enabled project, I want lock files and cache files to be gitignored, so that transient artifacts from the watch loop and GitHub sync don't pollute the repository.
3. As a developer cloning a beastmode-enabled project, I want the state directory structure to exist after clone, so that the runtime doesn't need to create directories on first run.

## Implementation Decisions

- Gitignore lives at `.beastmode/.gitignore` (nested) — does not modify the project's root `.gitignore`
- Patterns to ignore: `state/**`, `!state/*/.gitkeep`, `*.lock`, `*.cache.json`
- The `state/**` + `!state/*/.gitkeep` negation rule ignores all state contents while preserving the `.gitkeep` sentinel files that maintain directory structure
- Forward-only: no retroactive fix for existing projects that already committed state files
- No migration step in init — the gitignore is part of the skeleton copy, not a separate init phase
- Existing `.gitkeep` files in `state/{design,plan,implement,validate,release}/` remain in the skeleton

## Testing Decisions

- Verify the `.gitignore` file exists in the skeleton assets at `plugin/skills/beastmode/assets/.beastmode/.gitignore`
- Verify git status shows state files as untracked/ignored after skeleton install
- Verify `.gitkeep` files are still tracked despite `state/**` ignore rule
- Prior art: standard gitignore negation pattern testing — create files matching ignored patterns and verify `git status` output

## Out of Scope

- Retroactive migration for existing projects with committed state files
- Modifying the project's root `.gitignore`
- Adding a defensive `.gitignore` creation step to init for existing `.beastmode/` directories
- Runtime directory creation as a replacement for `.gitkeep` files

## Further Notes

None

## Deferred Ideas

None
