# delete-merge-coordinator

**Design:** .beastmode/state/design/2026-03-29-remove-merge-logic-from-cli.md

## User Stories

1. As a CLI maintainer, I want the merge-coordinator module and its tests deleted, so that the CLI has fewer moving parts and a smaller surface area.

## What to Build

Delete the merge-coordinator module entirely. This module contains all multi-branch merge orchestration logic — simulation, ordering, execution, and coordination. None of these capabilities are needed after this epic since the CLI no longer performs any merge operations.

Also delete any dedicated test file for the module. Remove any merge-coordinator imports or references from test files that validate module exports (e.g., the run-command test that asserts merge-coordinator exports exist).

This is a pure deletion feature. No new code is written.

## Acceptance Criteria

- [ ] `merge-coordinator.ts` no longer exists in the CLI source tree
- [ ] No test file references or imports merge-coordinator
- [ ] CLI compiles cleanly without the module
- [ ] No remaining imports of `coordinateMerges`, `mergeSingleBranch`, `simulateMerge`, `simulateAll`, `computeMergeOrder`, or `executeMerge` anywhere in the codebase
