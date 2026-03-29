# shared-project-sync

**Design:** .beastmode/state/design/2026-03-28-github-project-setup.md
**Architectural Decisions:** see manifest

## User Stories

4. As a user completing a design phase, I want the newly created epic automatically added to the project with Status set to "Design", so that the board reflects work in progress.

5. As a user completing a plan phase, I want the epic advanced to "Plan" and all new feature sub-issues added with Status "Plan", so that the board shows what's being planned.

6. As a user implementing features, I want the active feature set to "Implement" and the epic advanced to "Validate" when all features are done, so that the board tracks implementation progress.

7. As a user completing validate and release phases, I want the epic Status updated accordingly (Validate, Done), so that the board reflects the full lifecycle through completion.

## What to Build

Add a new "Add to Project + Set Status" operation to the shared `github.md` utility. This operation encapsulates the two-step pattern that all checkpoints need:

**Step 1 — Add to Project:** Call `gh project item-add <project-number> --owner <owner> --url <issue-url>` which is idempotent (returns existing item ID if already present). Parse the returned item ID from the JSON output.

**Step 2 — Set Status:** Read the cache file at `.beastmode/state/github-project.cache.json`. Look up the project ID, Status field ID, and the option ID for the target status name. Call the `updateProjectV2ItemFieldValue` GraphQL mutation to set the Status field on the item.

**Cache Miss Handling:** If the cache file doesn't exist or is unreadable, print a warning: "GitHub project cache not found. Run `/beastmode setup-github` to configure." Skip the Status set but don't block the workflow.

**Stale Cache Handling:** If the GraphQL mutation fails (e.g., stale IDs), print a warning: "GitHub project sync failed — cache may be stale. Rerun `/beastmode setup-github` to refresh." Continue without blocking.

The operation follows the existing warn-and-continue error handling convention from github.md.

## Acceptance Criteria

- [ ] New "Add to Project + Set Status" section exists in shared github.md
- [ ] Operation reads cache file for project/field/option IDs
- [ ] Operation calls `gh project item-add` and captures item ID
- [ ] Operation calls `updateProjectV2ItemFieldValue` to set Status
- [ ] Missing cache file produces a warning, not an error
- [ ] Failed mutation produces a warning, not an error
- [ ] Operation is self-contained — callers pass issue URL and target status name
