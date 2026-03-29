# cleanup-existing-board-features

**Design:** .beastmode/state/design/2026-03-28-epics-only-board.md
**Architectural Decisions:** see manifest

## User Stories

3. As a project maintainer, I want existing Feature issues removed from the board as part of this change, so that the board is clean immediately without manual cleanup later.

## What to Build

Perform a one-time cleanup of Feature issues currently on the GitHub Projects V2 board. This is an ad-hoc operation, not a codified reusable command:

- Query the project board for all items that are Feature issues (have `type/feature` label)
- For each Feature item found, remove it from the project board using the `deleteProjectV2Item` GraphQL mutation
- The Feature issues themselves remain as GitHub issues with their labels and sub-issue linkage intact — only the project board item is deleted

This requires:
- Reading the project cache to get the project ID
- Querying project items and filtering for Feature issues
- Calling `deleteProjectV2Item` for each matched item

The cleanup is performed once during implementation. It is not added as a persistent operation in any checkpoint or skill file.

## Acceptance Criteria

- [ ] All existing Feature issues are removed from the project board
- [ ] Feature issues remain as GitHub issues with labels and sub-issue linkage intact
- [ ] Only Epics remain as items on the project board after cleanup
- [ ] The cleanup is ad-hoc — no new reusable command or checkpoint step is created
