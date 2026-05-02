---
phase: plan
epic-id: bm-dcd0
epic-slug: lockfile-path-fix-dcd0
feature-name: Lockfile Path Fix
wave: 1
---

# Lockfile Path Fix

**Design:** `.beastmode/artifacts/design/2026-04-12-lockfile-path-fix-dcd0.md`

## User Stories

1. As a developer running `beastmode dashboard`, I want the lockfile to resolve correctly regardless of working directory, so that the dashboard starts without ENOENT errors.
2. As a developer with a stale lockfile from a previous session, I want the stale-PID detection to work at the new path, so that I don't get locked out.
3. As a developer, I want the lockfile gitignored at its new path, so that it never gets committed.

## What to Build

Change the lockfile resolution from the `cli/` subdirectory to the `.beastmode/` directory, which is project-rooted and always exists regardless of working directory.

The lockfile module's path function currently resolves to `<projectRoot>/cli/<lockfile-name>`. Change it to resolve to `<projectRoot>/.beastmode/<lockfile-name>`. This is a single-constant change — all consumers (acquire, release, read, stale detection) go through the same path function, so behavior is preserved.

Update the test that manually constructs the lockfile path for the stale-PID scenario to use the new `.beastmode/` directory.

Update the `.gitignore` entry to match the new specific path `.beastmode/.beastmode-watch.lock` instead of the bare pattern `.beastmode-watch.lock`.

Update context documentation references in orchestration and CLI design docs that cite the old `cli/.beastmode-watch.lock` path.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] `lockfilePath()` resolves to `<projectRoot>/.beastmode/.beastmode-watch.lock`
- [ ] Existing lockfile tests pass (acquire, release, stale detection) with no behavior changes
- [ ] `.gitignore` contains the new path entry
- [ ] Context docs reference the new path
- [ ] Dashboard starts without ENOENT when run from a worktree directory
