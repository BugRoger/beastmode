---
phase: design
epic-id: bm-dcd0
epic-slug: lockfile-path-fix-dcd0
epic-name: Lockfile Path Fix
---

## Problem Statement

The watch loop lockfile path is hardcoded to `cli/.beastmode-watch.lock`. When the CLI runs from a different working directory (e.g., inside a worktree), the resolved path points to a non-existent directory, causing an ENOENT error that prevents the dashboard from starting.

## Solution

Move the lockfile from `cli/.beastmode-watch.lock` to `.beastmode/.beastmode-watch.lock`. The `.beastmode/` directory is project-rooted and always exists, making the lockfile resilient to working directory changes.

## User Stories

1. As a developer running `beastmode dashboard`, I want the lockfile to resolve correctly regardless of working directory, so that the dashboard starts without ENOENT errors.
2. As a developer with a stale lockfile from a previous session, I want the stale-PID detection to work at the new path, so that I don't get locked out.
3. As a developer, I want the lockfile gitignored at its new path, so that it never gets committed.

## Implementation Decisions

- Change `lockfilePath()` in `cli/src/lockfile.ts` to resolve to `.beastmode/` instead of `cli/`.
- Update the test in `cli/src/__tests__/watch.test.ts` that hardcodes the `cli/` path for the stale lockfile scenario.
- Update `.gitignore` entry from `.beastmode-watch.lock` to `.beastmode/.beastmode-watch.lock`.
- Update context doc references in `context/design/orchestration.md` and `context/design/cli.md` to reflect the new path.

## Testing Decisions

- Existing lockfile tests (acquire, release, stale detection) cover the behavior — only the path constant and the stale-lockfile test setup need updating.
- No new tests required; the fix is a path change, not a behavior change.

## Out of Scope

- Lockfile format changes.
- Additional lockfile features (timeout, retry, etc.).

## Further Notes

None.

## Deferred Ideas

None.
