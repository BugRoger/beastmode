# 3. Checkpoint

## 1. Save Report

Save to `.beastmode/state/validate/YYYY-MM-DD-<feature>.md` where `<feature>` is the epic slug.

## 1.5. Write Phase Output

Write the phase output contract file to `.beastmode/state/validate/YYYY-MM-DD-<feature>.output.json`:

```json
{
  "status": "completed",
  "artifacts": {
    "report": ".beastmode/state/validate/YYYY-MM-DD-<feature>.md",
    "passed": true
  }
}
```

- Set `status` to `"completed"` if validation passed, `"error"` if it failed
- Set `passed` to `true` or `false` matching the validation result
- The `report` path matches the report written in Step 1

## 2. Phase Retro

@../_shared/retro.md

## 3. Commit and Handoff

If FAIL:
```
Validation failed. Fix issues and re-run:
beastmode validate <feature>
```
STOP — do not proceed to commit.

If PASS:

Commit all work to the feature branch:

```bash
git add -A
git commit -m "validate(<feature>): checkpoint"
```

Print:

```
Next: beastmode release <feature>
```

STOP. No additional output.
