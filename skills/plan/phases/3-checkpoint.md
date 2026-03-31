# 3. Checkpoint

## 1. Write Feature Plan Files

For each feature, save to `.beastmode/artifacts/plan/YYYY-MM-DD-<design>-<feature-slug>.md` using the template from [feature-format.md](../references/feature-format.md).

Where `<design>` is the epic slug and `<feature-slug>` is the feature's name slug.

Each feature plan file must begin with YAML frontmatter:

```
---
phase: plan
epic: <design>
feature: <feature-slug>
wave: <N>
---
```

## 2. Phase Retro

@../_shared/retro.md

## 3. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "plan(<feature>): checkpoint"
```

Print features and their implement commands:

```
Features ready for implementation:

Wave 1:
  1. <feature-1> → beastmode implement <design> <feature-1>
  2. <feature-2> → beastmode implement <design> <feature-2>

Wave 2:
  3. <feature-3> → beastmode implement <design> <feature-3>
```

STOP. No additional output.
