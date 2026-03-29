# skip-feature-board-add

**Design:** .beastmode/state/design/2026-03-28-epics-only-board.md
**Architectural Decisions:** see manifest

## User Stories

1. As a project maintainer, I want only Epics on the project board, so that the board shows a clean lifecycle view of capabilities without implementation-level noise.
2. As a developer, I want Feature issues to retain status labels and sub-issue linkage, so that I can still query and track feature-level progress via GitHub's issue UI and API.

## What to Build

Remove the "Add Feature to Project" steps from three checkpoint/prime files that currently call the shared "Add to Project + Set Status" operation for Feature issues:

- **Plan checkpoint** (step 4): Remove the step that adds each newly created Feature sub-issue to the project board after creation. Feature issues are still created and linked as sub-issues of the Epic — only the board-add is removed.
- **Implement prime** (step 2): Remove the step that adds the Feature to the project board when setting it to in-progress. The status label transition (`status/ready` to `status/in-progress`) remains.
- **Implement checkpoint** (step 2): Remove the step that adds the completed Feature to the project board with status "Done". The issue close operation remains.

Additionally, update the context documentation to reflect that Features are no longer board items:

- **github-state-model.md** (L2 context): Add a rule that Features are not added to the project board — only Epics are board items.
- **DESIGN.md** (L1 context): Update the GitHub State Model summary to mention the epics-only board model.

The shared utility (`_shared/github.md`) remains unchanged — it is a generic operation. Callers simply stop invoking it for Feature issues.

## Acceptance Criteria

- [ ] Plan checkpoint no longer calls "Add to Project + Set Status" for Feature issues
- [ ] Implement prime no longer calls "Add to Project + Set Status" for Feature issues
- [ ] Implement checkpoint no longer calls "Add to Project + Set Status" for completed Feature issues
- [ ] Epic board-add operations in all checkpoints remain unchanged
- [ ] Feature issue creation, label transitions, sub-issue linkage, and closing remain unchanged
- [ ] Context doc `github-state-model.md` documents the epics-only board rule
- [ ] Context doc `DESIGN.md` GitHub State Model section reflects the change
