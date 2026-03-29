# 3. Checkpoint

## 1. Save Report

Save to `.beastmode/artifacts/validate/YYYY-MM-DD-<feature>.md` where `<feature>` is the epic slug.

The validation report must begin with YAML frontmatter:

```
---
phase: validate
slug: <feature>
status: passed
---
```

Set `status` to `passed` or `failed` matching the validation result.

## 2. Phase Retro

@../_shared/retro.md

## 3. Commit and Handoff

If FAIL:
```
Validation failed. Fix issues and re-run:
beastmode validate <feature>
```
STOP. No additional output.

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
