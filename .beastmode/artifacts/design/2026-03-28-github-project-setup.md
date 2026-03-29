## Problem Statement

GitHub Project board "Beastmode Pipeline" shows zero items despite epics and features being created as issues. The setup-github skill creates the project and links the repo but doesn't configure the Status field columns, doesn't write a cache file for downstream use, and doesn't backfill existing issues. Phase checkpoints create and transition issues but never add them to the project or set the project Status field. The board is cosmetically correct but operationally empty.

## Solution

Update the setup-github skill to fully configure the project: set Status field options (7 pipeline columns via GraphQL), write a cache file with project/field/option IDs, backfill existing epic and feature issues into the project, and print manual instructions for UI-only settings (workflows and views). Add a shared "Add to Project + Set Status" operation to github.md. Update all phase checkpoints to add issues to the project and set the Status field at every transition.

## User Stories

1. As a user running setup-github, I want the project Status field configured with pipeline columns (Backlog, Design, Plan, Implement, Validate, Release, Done), so that the board reflects the beastmode workflow without manual UI configuration.

2. As a user running setup-github, I want existing epic and feature issues backfilled into the project with correct Status values derived from their phase labels, so that the board is accurate immediately after setup.

3. As a user running setup-github, I want project IDs and Status field metadata cached locally, so that checkpoints can set project Status with a single API call instead of multiple discovery queries.

4. As a user completing a design phase, I want the newly created epic automatically added to the project with Status set to "Design", so that the board reflects work in progress.

5. As a user completing a plan phase, I want the epic advanced to "Plan" and all new feature sub-issues added with Status "Plan", so that the board shows what's being planned.

6. As a user implementing features, I want the active feature set to "Implement" and the epic advanced to "Validate" when all features are done, so that the board tracks implementation progress.

7. As a user completing validate and release phases, I want the epic Status updated accordingly (Validate, Done), so that the board reflects the full lifecycle through completion.

## Implementation Decisions

- Setup-github configures the built-in Status single-select field with 7 options via `updateProjectV2Field` GraphQL mutation: Backlog (GRAY), Design (PURPLE), Plan (BLUE), Implement (YELLOW), Validate (ORANGE), Release (GREEN), Done (GREEN)
- Project metadata cached to `.beastmode/state/github-project.cache.json` containing project node ID, project number, Status field ID, and option name-to-ID map
- Cache file is NOT in config.yaml — config is for human settings, cache is for API metadata
- Setup-github backfills existing `type/epic` and `type/feature` issues into the project, deriving Status from their current `phase/*` labels
- Setup-github prints manual instructions for enabling project workflows ("Item added to project" → Backlog default, "Item closed" → Done, "Auto-add sub-issues" → already enabled) — no API exists to enable these programmatically
- Setup-github prints manual instructions for configuring project views (board grouped by Status) — no API exists for view management
- Shared github.md gets a new "Add to Project + Set Status" operation: calls `gh project item-add` (idempotent, returns item ID whether new or existing), then calls `updateProjectV2ItemFieldValue` using cached IDs
- All phase checkpoints updated to call the new shared operation after creating or transitioning issues
- Design checkpoint: add Epic → Status "Design"
- Plan checkpoint: Epic → Status "Plan", each Feature → Status "Plan"
- Implement checkpoint: active Feature → Status "Implement"; when all features done, Epic → Status "Validate"
- Validate checkpoint: Epic → Status "Validate" (safety net)
- Release checkpoint: Epic → Status "Done" (may also be handled by "Item closed" workflow if enabled)
- Feature Status lifecycle on the board: Plan → Implement → Done (no Backlog/Design/Validate/Release for features — those are Epic-level phases)
- Stale cache handling: if a checkpoint's project mutation fails, warn user to rerun `/beastmode setup-github` — no inline rediscovery logic in checkpoints
- `gh project item-add` used as lookup-or-create — no need to store item IDs in manifest or cache since it's idempotent and returns the item ID each time
- Only epics and features enter the project — controlled by checkpoint code (only adds `type/epic` and `type/feature` issues) and the "Auto-add sub-issues" workflow (only adds children of items already in the project)

## Testing Decisions

- Setup-github can be tested by running it against the existing repo and verifying: Status field options match the 7 pipeline columns, cache file exists with valid IDs, existing issues appear in the project with correct Status
- Checkpoint sync can be tested by running a full design → plan cycle and verifying the project board updates at each transition
- Cache staleness can be tested by corrupting the cache file and verifying the checkpoint warns appropriately
- Similar test patterns: the existing setup-github skill already tests gh auth and repo prerequisites — follow that pattern for new GraphQL calls

## Out of Scope

- GitHub Actions automation for roll-up or status sync
- Programmatic project workflow enablement (API doesn't exist)
- Programmatic project view creation (API doesn't exist)
- Custom project fields beyond the built-in Status
- Multi-repo project support

## Further Notes

- The `updateProjectV2Field` mutation with `singleSelectOptions` replaces all existing options — this is intentional and makes setup idempotent, but will overwrite any manual customization of the Status field
- The "Auto-add sub-issues to project" workflow is already enabled on the existing project — setup-github should verify this rather than assume it

## Deferred Ideas

- Automated reconciliation: a `/beastmode reconcile` command that re-syncs all manifest state to GitHub without rerunning full phases
- GitHub Actions workflow that auto-sets Status based on label changes, removing the need for checkpoint-driven sync
