# 3. Checkpoint

## 1. Save Deviation Log

If deviations were tracked during execution, save to `.beastmode/artifacts/implement/YYYY-MM-DD-<design>-<feature-slug>-deviations.md`:

    # Implementation Deviations: <feature-slug>

    **Date:** YYYY-MM-DD
    **Feature Plan:** .beastmode/artifacts/plan/YYYY-MM-DD-<design>-<feature-slug>.md
    **Tasks completed:** N/M
    **Deviations:** N total

    ## Auto-Fixed
    - Task N: <description>

    ## Blocking
    - Task N: <description>

    ## Architectural
    - Task N: <description> — User decision: <choice>

If no deviations, skip this step.

Note: The primary implement artifact (the deviation log when it exists) must begin with YAML frontmatter:

```yaml
---
phase: implement
epic: <design>
feature: <feature-slug>
status: completed
---
```

Set `status` to `completed` if all tasks passed, `error` if any task is blocked.

## 2. Phase Retro

@../_shared/retro.md

## 3. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "implement(<feature>): checkpoint"
```

```
Next: /validate
```

STOP. No additional output.
