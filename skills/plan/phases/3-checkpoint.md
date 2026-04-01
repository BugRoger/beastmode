# 3. Checkpoint

## 1. Write Feature Plan Files

For each feature, save to `.beastmode/artifacts/plan/YYYY-MM-DD-<design>-<feature-slug>.md` using the template from [feature-format.md](../references/feature-format.md).

Where `<design>` is the epic slug and `<feature-slug>` is the feature's name slug.

Each feature plan file must begin with YAML frontmatter:

```
---
phase: plan
slug: <hex>
epic: <design>
feature: <feature-slug>
wave: <N>
---
```

## 2. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "plan(<feature>): checkpoint"
```

Print features and their implement commands:

```
Features ready for implementation:

Wave 1:
  1. <feature-a> → beastmode implement <design> <feature-a>
  2. <feature-b> → beastmode implement <design> <feature-b>

Wave 2:
  3. <feature-c> → beastmode implement <design> <feature-c>
```

STOP. No additional output.
