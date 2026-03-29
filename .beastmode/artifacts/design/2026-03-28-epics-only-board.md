## Problem Statement

Feature issues on the GitHub Projects V2 board clutter the view, making it hard to see the high-level lifecycle of capabilities flowing through design → release. Only Epics represent meaningful board-level units; Features are implementation details tracked via the parent Epic's sub-issue hierarchy.

## Solution

Remove Feature issues from the project board while keeping them as GitHub issues linked as sub-issues of their parent Epic. Epics remain on the board with phase-based column tracking. Feature issues retain their status labels (ready, in-progress, blocked) for queryability via GitHub search and API, but no longer appear as board items.

## User Stories

1. As a project maintainer, I want only Epics on the project board, so that the board shows a clean lifecycle view of capabilities without implementation-level noise.
2. As a developer, I want Feature issues to retain status labels and sub-issue linkage, so that I can still query and track feature-level progress via GitHub's issue UI and API.
3. As a project maintainer, I want existing Feature issues removed from the board as part of this change, so that the board is clean immediately without manual cleanup later.

## Implementation Decisions

- Feature issues continue to be created as GitHub issues with `type/feature` and `status/*` labels
- Feature issues continue to be linked as sub-issues of their parent Epic
- The `gh project item-add` call is skipped for Feature issues — only Epics are added to the project board
- Feature status label transitions (ready → in-progress → blocked/completed) remain unchanged
- Epic completion rollup via `subIssuesSummary` GraphQL query is unaffected (sub-issues are independent of project board membership)
- Existing Feature issues on the board are removed during implementation via `deleteProjectV2Item` — this is a one-time ad-hoc cleanup, not a codified operation
- Context docs (github-state-model.md, DESIGN.md) are updated as part of implementation scope to reflect the new model

## Testing Decisions

- Verify that `gh project item-add` is no longer called for Feature issues in plan and implement checkpoints
- Verify that Epic creation still adds the Epic to the project board with correct status column
- Verify that Feature sub-issue linkage and status label transitions are preserved
- Manual verification that the board shows only Epics after cleanup
- Prior art: existing checkpoint integration tests pattern (if any) in the skill phase files

## Out of Scope

- Changing the label taxonomy (12 labels remain as-is)
- Modifying the manifest schema
- Changing the sub-issue hierarchy (Epic > Feature remains two-level)
- Adding a reusable cleanup subcommand — cleanup is ad-hoc during implementation
- Auto-add or GitHub Actions workflows

## Further Notes

None

## Deferred Ideas

None
