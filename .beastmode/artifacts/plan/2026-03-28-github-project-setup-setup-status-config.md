# setup-status-config

**Design:** .beastmode/state/design/2026-03-28-github-project-setup.md
**Architectural Decisions:** see manifest

## User Stories

1. As a user running setup-github, I want the project Status field configured with pipeline columns (Backlog, Design, Plan, Implement, Validate, Release, Done), so that the board reflects the beastmode workflow without manual UI configuration.

3. As a user running setup-github, I want project IDs and Status field metadata cached locally, so that checkpoints can set project Status with a single API call instead of multiple discovery queries.

## What to Build

Extend the setup-github skill with two new capabilities after the existing "Configure Board Columns" step:

**Status Field Configuration:** Use the `updateProjectV2Field` GraphQL mutation with `singleSelectOptions` to replace the project's built-in Status field options with the 7 pipeline columns: Backlog (GRAY), Design (PURPLE), Plan (BLUE), Implement (YELLOW), Validate (ORANGE), Release (GREEN), Done (GREEN). This is idempotent — rerunning setup resets the options. The mutation requires the Status field ID (already discovered in step 5) and the project ID.

**Cache File Write:** After configuring the Status field, query back the field's option IDs (the mutation response or a follow-up query provides them) and write a JSON cache file to `.beastmode/state/github-project.cache.json`. The cache contains: project node ID, project number, Status field ID, and a map of option name to option ID for all 7 columns. Include a `cachedAt` ISO-8601 timestamp.

**Manual Instructions:** After the summary, print instructions for UI-only settings that can't be configured via API: enable "Item added to project" workflow (set default to Backlog), enable "Item closed" workflow (set to Done), verify "Auto-add sub-issues" is enabled, and configure a board view grouped by Status.

## Acceptance Criteria

- [ ] Running setup-github sets the Status field to exactly 7 options with correct names and colors
- [ ] Cache file exists at `.beastmode/state/github-project.cache.json` after setup
- [ ] Cache contains projectId, projectNumber, statusField.id, and statusField.options map with all 7 entries
- [ ] Cache contains a cachedAt timestamp
- [ ] Rerunning setup-github updates the cache file (idempotent)
- [ ] Manual workflow and view instructions are printed in the summary
