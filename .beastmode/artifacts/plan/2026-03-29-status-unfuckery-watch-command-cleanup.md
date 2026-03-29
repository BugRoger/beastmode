# Watch Command Cleanup

**Design:** .beastmode/state/design/2026-03-29-status-unfuckery.md

## User Stories

4. As a user running `beastmode watch`, I want the watch loop to not re-seed stale manifests into the pipeline directory on startup, so that wiped bad data stays gone.
5. As a developer working on the CLI, I want the watch-command to import state-scanner directly instead of maintaining a duplicate inline scanner, so that there's one source of truth for epic state derivation.

## What to Build

Remove the `seedPipelineState` function from the watch-command module entirely. This function copies old-format manifests from `state/plan/` into the pipeline directory on watch startup, which is what re-introduces stale data after cleanup. With output.json-based phase detection in the state scanner, this seeding is no longer needed — manifests only appear in pipeline/ when `reconcileState` writes them after successful phase runs.

Remove the `scanEpicsInline` fallback function from the watch-command module. This was a duplicate scanner maintained as a fallback when the state-scanner module was unavailable. Replace all call sites with a direct import of `scanEpics` from the state-scanner module.

Delete all existing `.beastmode/pipeline/*.manifest.json` files as a one-time data wipe. These stale manifests are the direct cause of the status output corruption — they were seeded copies that were never updated by the watch loop.

## Acceptance Criteria

- [ ] `seedPipelineState` function is removed from watch-command
- [ ] No call to `seedPipelineState` exists anywhere in the codebase
- [ ] `scanEpicsInline` function is removed from watch-command
- [ ] Watch-command imports `scanEpics` directly from state-scanner
- [ ] All existing `.beastmode/pipeline/*.manifest.json` files are deleted
- [ ] Watch loop startup no longer copies manifests from state/plan/ to pipeline/
- [ ] Watch loop still functions correctly with direct state-scanner import
