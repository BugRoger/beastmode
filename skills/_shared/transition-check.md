# Transition Check — Reference Only

> **Note:** This file is documentation only. Transition logic is now executed inline via `## N. Gate: transitions.*` steps in each phase checkpoint, processed by the task runner. This file is NOT @imported by any phase file.

Transition behavior by mode, for reference:

### human mode
Print the next step suggestion and STOP:
```
Next step:
/next-skill <artifact-path>
```

### auto mode
Call the Skill tool to invoke the next skill:
`Skill(skill="beastmode:<next-skill>", args="<artifact-path>")`

The `<next-skill>` and `<artifact-path>` come from the Phase-to-Skill Mapping table below and the checkpoint's "Next skill" line.

## Phase-to-Skill Mapping

| Transition | Next Skill | Artifact |
|-----------|------------|----------|
| design-to-plan | `beastmode:plan` | `.beastmode/state/design/YYYY-MM-DD-<feature>.md` |
| plan-to-implement | `beastmode:implement` | `.beastmode/state/plan/YYYY-MM-DD-<feature>.md` |
| implement-to-validate | `beastmode:validate` | `YYYY-MM-DD-<feature>.md` |
| validate-to-release | `beastmode:release` | `YYYY-MM-DD-<feature>.md` |
