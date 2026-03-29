# setup-backfill

**Design:** .beastmode/state/design/2026-03-28-github-project-setup.md
**Architectural Decisions:** see manifest

## User Stories

2. As a user running setup-github, I want existing epic and feature issues backfilled into the project with correct Status values derived from their phase labels, so that the board is accurate immediately after setup.

## What to Build

Add a backfill step to setup-github that runs after the cache file is written (depends on setup-status-config). This step:

**Discover Existing Issues:** Query the repo for all issues with `type/epic` or `type/feature` labels using `gh issue list`.

**Add to Project:** For each discovered issue, call `gh project item-add` to add it to the project (idempotent — skips if already present). Capture the returned item ID.

**Derive Status:** For epics, read the issue's `phase/*` label and map it to the corresponding Status field option (e.g., `phase/design` → "Design", `phase/implement` → "Implement"). For features, map `status/*` labels: `status/ready` → "Plan", `status/in-progress` → "Implement". Closed issues get "Done". Issues with no phase/status label get "Backlog".

**Set Status:** Use the cached field/option IDs to call `updateProjectV2ItemFieldValue` for each item. Use the shared "Add to Project + Set Status" operation from github.md once that exists, or inline the logic if implementing before the shared operation.

All backfill operations use warn-and-continue — individual failures don't block the rest.

## Acceptance Criteria

- [ ] After running setup-github, all existing `type/epic` issues appear in the project
- [ ] After running setup-github, all existing `type/feature` issues appear in the project
- [ ] Each backfilled issue has the correct Status derived from its labels
- [ ] Issues with no phase/status label are set to "Backlog"
- [ ] Closed issues are set to "Done"
- [ ] Individual backfill failures don't block other issues from being processed
