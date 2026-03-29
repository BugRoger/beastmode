# Migration Strategy

## Context
The github-cli-migration moves sync logic from skills to CLI and redesigns the manifest schema. This requires a migration strategy for existing state.

## Decision
Clean cut, no backward compatibility. Delete old manifests in `state/plan/*.manifest.json`. Rewrite CLI manifest module. No support for old schema — this is the beastmode project, all state can be recreated. Skill cleanup: delete `skills/_shared/github.md`, remove GitHub sync sections from 5 checkpoint files and implement prime, remove manifest creation/mutation from all skills, add output file writing to each checkpoint.

## Rationale
Backward compatibility adds complexity without proportional value in a single-project tool. All state can be recreated from the repo. Clean cut allows the new schema and sync model to be validated independently without legacy code paths.

## Source
.beastmode/state/design/2026-03-28-github-phase-integration.md
.beastmode/state/design/2026-03-29-github-cli-migration.md
