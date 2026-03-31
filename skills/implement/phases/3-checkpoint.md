# 3. Checkpoint

## 1. Save Deviation Log

Save to `.beastmode/artifacts/implement/YYYY-MM-DD-<design>-<feature-slug>.md`:

IMPORTANT: The filename MUST be exactly `YYYY-MM-DD-<design>-<feature-slug>.md` — no
extra suffixes like `-deviations`. The stop hook derives the output.json filename from
this basename, and the watch loop matches on `-<epic>-<feature>.output.json`. Any extra
suffix breaks the match and the watch loop never sees completion.

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

If no deviations, still write this file with "Deviations: 0" and "No deviations" body.
This file MUST always be written — the stop hook reads its frontmatter to generate
output.json, which the watch loop uses to detect completion.

The artifact MUST begin with YAML frontmatter:

```yaml
---
phase: implement
epic: <design>
feature: <feature-slug>
status: completed
---
```

Set `status` to `completed` if all tasks passed, `error` if any task is blocked.

## 2. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "implement(<feature>): checkpoint"
```

Print:

```
Next: beastmode validate <feature>
```

STOP. No additional output.
