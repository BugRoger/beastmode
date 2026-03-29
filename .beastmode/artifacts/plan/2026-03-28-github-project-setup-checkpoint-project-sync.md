# checkpoint-project-sync

**Design:** .beastmode/state/design/2026-03-28-github-project-setup.md
**Architectural Decisions:** see manifest

## User Stories

4. As a user completing a design phase, I want the newly created epic automatically added to the project with Status set to "Design", so that the board reflects work in progress.

5. As a user completing a plan phase, I want the epic advanced to "Plan" and all new feature sub-issues added with Status "Plan", so that the board shows what's being planned.

6. As a user implementing features, I want the active feature set to "Implement" and the epic advanced to "Validate" when all features are done, so that the board tracks implementation progress.

7. As a user completing validate and release phases, I want the epic Status updated accordingly (Validate, Done), so that the board reflects the full lifecycle through completion.

## What to Build

Wire the shared "Add to Project + Set Status" operation into every phase checkpoint and implement prime that has a GitHub sync step. Each callsite adds one or two lines invoking the shared operation with the appropriate issue URL and target status.

**Design Checkpoint** (Step 3 — Sync GitHub): After creating the Epic issue, call "Add to Project + Set Status" with the epic URL and status "Design".

**Plan Checkpoint** (Step 3 — Sync GitHub): After advancing the Epic's phase label to `phase/plan`, call "Add to Project + Set Status" with the epic URL and status "Plan". After creating each Feature sub-issue, call "Add to Project + Set Status" with the feature URL and status "Plan".

**Implement Prime** (Step 5 — Set Feature In-Progress): After setting the feature's `status/in-progress` label, call "Add to Project + Set Status" with the feature URL and status "Implement". After advancing the Epic to `phase/implement`, call "Add to Project + Set Status" with the epic URL and status "Implement".

**Implement Checkpoint** (Step 3 — Sync GitHub): After closing the feature issue, call "Add to Project + Set Status" with the feature URL and status "Done". If all features are complete and Epic advances to `phase/validate`, call "Add to Project + Set Status" with the epic URL and status "Validate".

**Validate Checkpoint** (Step 2 — Sync GitHub): After setting the Epic's phase label to `phase/validate`, call "Add to Project + Set Status" with the epic URL and status "Validate".

**Release Checkpoint** (Step 2 — Sync GitHub): After advancing Epic to `phase/done` and closing it, call "Add to Project + Set Status" with the epic URL and status "Done".

All calls follow the existing warn-and-continue pattern — project sync failures don't block phase progression.

## Acceptance Criteria

- [ ] Design checkpoint adds Epic to project with Status "Design"
- [ ] Plan checkpoint sets Epic to "Plan" and each Feature to "Plan"
- [ ] Implement prime sets active Feature to "Implement" and Epic to "Implement"
- [ ] Implement checkpoint sets completed Feature to "Done" and Epic to "Validate" when all done
- [ ] Validate checkpoint sets Epic to "Validate"
- [ ] Release checkpoint sets Epic to "Done"
- [ ] All project sync calls use warn-and-continue — failures produce warnings, not errors
- [ ] Project sync is skipped when github.enabled is false or cache is missing
