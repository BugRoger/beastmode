# Transition Check

Smart phase-to-phase transition logic. Import this in each phase's 3-checkpoint.md at the "Suggest Next Step" position.

## Usage

Replace hardcoded "Suggest /next-skill" blocks with:

```
@../_shared/transition-check.md
```

## Logic

1. Read `.beastmode/config.yaml`
2. Look up `transitions.<current-phase>-to-<next-phase>`
3. If config file not found or transition not found → default to `human`

### human mode
Print the next step suggestion and STOP:
```
Next step:
/next-skill <artifact-path>
```

### auto mode
1. Estimate context remaining (heuristic from conversation length)
2. Read `transitions.context_threshold` (default: 60)
3. If context remaining >= threshold:
   - Call the Skill tool to invoke the next skill:
     `Skill(skill="beastmode:<next-skill>", args="<artifact-path>")`
   - The `<next-skill>` and `<artifact-path>` come from the Phase-to-Skill Mapping table below and the checkpoint's "Next skill" line
4. If context remaining < threshold:
   - Print:
     ```
     Context is low (~X% remaining). Start a new session and run:
     /beastmode:<next-skill> <artifact-path>
     ```
   - STOP

## Phase-to-Skill Mapping

| Transition | Next Skill | Artifact |
|-----------|------------|----------|
| design-to-plan | `beastmode:plan` | `.beastmode/state/design/YYYY-MM-DD-<feature>.md` |
| plan-to-implement | `beastmode:implement` | `.beastmode/state/plan/YYYY-MM-DD-<feature>.md` |
| implement-to-validate | `beastmode:validate` | `YYYY-MM-DD-<feature>.md` |
| validate-to-release | `beastmode:release` | `YYYY-MM-DD-<feature>.md` |
