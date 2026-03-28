# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Save Deviation Log

If deviations were tracked during execution, save to `.beastmode/state/implement/YYYY-MM-DD-<feature>-deviations.md` where `<feature>` is the worktree directory name:

    # Implementation Deviations: <feature>

    **Date:** YYYY-MM-DD
    **Plan:** .beastmode/state/plan/YYYY-MM-DD-<feature>.md
    **Tasks completed:** N/M
    **Deviations:** N total

    ## Auto-Fixed
    - Task N: <description>

    ## Blocking
    - Task N: <description>

    ## Architectural
    - Task N: <description> — User decision: <choice>

If no deviations, skip this step.

## 2. Sync GitHub

Read `.beastmode/config.yaml`. If `github.enabled` is `false` or missing, or the manifest has no `github` block, skip this step.

@../_shared/github.md

Use warn-and-continue for all GitHub calls (see Error Handling Convention in github.md).

1. **Close Feature Issue:**

```bash
gh issue close <feature-issue-number>
```

2. **Add Feature to Project** — call the "Add to Project + Set Status" operation from github.md with the feature URL and status `"Done"`.

3. **Check Epic Completion** — use the "Check Epic Completion" operation from github.md.

4. **Advance Epic** — if `percentCompleted` == 100 (all features done):

```bash
gh issue edit <epic-number> --remove-label "phase/implement" --add-label "phase/validate"
```

5. **Add Epic to Project** — if all features are complete, call the "Add to Project + Set Status" operation from github.md with the epic URL and status `"Validate"`.

## 3. Phase Retro

@../_shared/retro.md

## 4. [GATE|transitions.implement-to-validate]

Read `.beastmode/config.yaml` → resolve mode for `transitions.implement-to-validate`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:validate <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:validate", args="<feature>")`
