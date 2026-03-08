# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Save Report

Save to `.beastmode/state/validate/YYYY-MM-DD-<feature>.md` where `<feature>` is the worktree directory name.

## 2. Phase Retro

@../_shared/retro.md

## 3. [GATE|transitions.validate-to-release]

If FAIL:
```
Validation failed. Fix issues and re-run:
`/beastmode:validate`
```
STOP — do not proceed to transition check.

If PASS:

Read `.beastmode/config.yaml` → resolve mode for `transitions.validate-to-release`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:release <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:release", args="<feature>")`
