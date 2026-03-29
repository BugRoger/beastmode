# 3. Checkpoint

## 1. Save Deviation Log

If deviations were tracked during execution, save to `.beastmode/state/implement/YYYY-MM-DD-<design>-<feature-slug>-deviations.md`:

    # Implementation Deviations: <feature-slug>

    **Date:** YYYY-MM-DD
    **Feature Plan:** .beastmode/state/plan/YYYY-MM-DD-<design>-<feature-slug>.md
    **Tasks completed:** N/M
    **Deviations:** N total

    ## Auto-Fixed
    - Task N: <description>

    ## Blocking
    - Task N: <description>

    ## Architectural
    - Task N: <description> — User decision: <choice>

If no deviations, skip this step.

## 1.5. Write Phase Output

Write the phase output contract file to `.beastmode/state/implement/YYYY-MM-DD-<design>-<feature-slug>.output.json`:

```json
{
  "status": "completed",
  "artifacts": {
    "features": [
      {"slug": "<feature-slug>", "status": "completed"}
    ],
    "deviations": ".beastmode/state/implement/YYYY-MM-DD-<design>-<feature-slug>-deviations.md"
  }
}
```

- Set `status` to `"completed"` if all tasks passed, `"error"` if any task is blocked
- The `deviations` field is only included if deviations were tracked (Step 1 wrote the file)
- If no deviations, omit the `deviations` field from artifacts

## 2. Update Manifest Status

Read the manifest JSON (resolved in prime). Update the current feature's status to `completed`. Update `lastUpdated` timestamp. Write back.

## 3. Phase Retro

@../_shared/retro.md

## 4. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "implement(<feature>): checkpoint"
```

Check manifest for remaining pending features. Print status:

```
Feature Status:
  ✓ feature-1 — completed
  ○ feature-2 — pending
  ○ feature-3 — pending

Next pending: beastmode implement <design> <feature-2>
```

If ALL features completed:
```
All features implemented. Next: beastmode validate <design>
```

STOP. No additional output.
