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

## 2. Update Manifest Status

Read the manifest JSON (resolved in prime). Update the current feature's status to `completed`. Update `lastUpdated` timestamp. Write back.

## 3. Sync GitHub

Read `.beastmode/config.yaml`. If `github.enabled` is `false` or missing, or the manifest has no `github` block, **skip this step entirely**.

When `github.enabled` is `true` and the feature has a `github.issue` number:

@../_shared/github.md

Use warn-and-continue for all GitHub calls (see Error Handling Convention in github.md).

1. **Close Feature Issue:**

```bash
gh issue close <feature-issue-number>
```

2. **Check Epic Completion** — use the "Check Epic Completion" operation from github.md:

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        subIssuesSummary {
          total
          completed
          percentCompleted
        }
      }
    }
  }
' -f owner="$owner" -f repo="$repo" -F number=<epic-number>
```

3. **Advance Epic** — if `percentCompleted` == 100 (all features done), advance Epic to `phase/validate`:

```bash
gh issue edit <epic-number> --remove-label "phase/implement" --add-label "phase/validate"
```

If GitHub sync fails, the manifest status (`completed`) is the authority. GitHub catches up at the next checkpoint.

## 4. Phase Retro

@../_shared/retro.md

## 5. Commit and Handoff

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

Next pending: just implement <design> <feature-2>
```

If ALL features completed:
```
All features implemented. Next: just validate <design>
```

STOP. No additional output.
