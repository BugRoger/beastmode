# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Write Feature Plan Files

For each feature, save to `.beastmode/state/plan/YYYY-MM-DD-<design>-<feature-slug>.md` using the template from [feature-format.md](../references/feature-format.md).

Where `<design>` is the worktree directory name (from "Derive Feature Name") and `<feature-slug>` is the feature's name slug.

## 2. Write Manifest

Read the existing manifest at `.beastmode/state/plan/YYYY-MM-DD-<design>.manifest.json` (created by the design checkpoint). Enrich it with the architectural decisions and features array, then write it back.

If no existing manifest is found, create a new one (backwards compatibility with designs created before manifest support).

```json
{
  "design": ".beastmode/state/design/YYYY-MM-DD-<design>.md",
  "architecturalDecisions": [
    {"decision": "<description>", "choice": "<choice>"}
  ],
  "features": [
    {
      "slug": "<feature-slug>",
      "plan": "YYYY-MM-DD-<design>-<feature-slug>.md",
      "status": "pending"
    }
  ],
  "lastUpdated": "<ISO-8601-timestamp>"
}
```

Preserve any existing fields (e.g., `github` block from design checkpoint) — only add/overwrite `architecturalDecisions`, `features`, and `lastUpdated`.

## 3. Sync GitHub

Read `.beastmode/config.yaml`. If `github.enabled` is `false` or missing, or the manifest has no `github` block, **skip this step entirely**.

When `github.enabled` is `true` and the manifest has `github.epic`:

@../_shared/github.md

Use warn-and-continue for all GitHub calls (see Error Handling Convention in github.md).

1. **Advance Epic Phase** — set the Epic's phase label to `phase/plan` (removing the previous `phase/design`):

```bash
# Use Set Phase Label from github.md on the epic issue
gh issue edit <epic-number> --remove-label "phase/design" --add-label "phase/plan"
```

2. **Create Feature Sub-Issues** — for each feature in the manifest:
   - Create a Feature issue using the "Create Feature" operation from github.md
   - Labels: `type/feature`, `status/ready`
   - Link as sub-issue of the Epic
   - Write the issue number into the manifest feature entry as `github.issue`

3. **Update Manifest** — write the enriched manifest with feature issue numbers:

```json
{
  "features": [
    {
      "slug": "<feature-slug>",
      "plan": "YYYY-MM-DD-<design>-<feature-slug>.md",
      "status": "pending",
      "github": {"issue": <issue-number>}
    }
  ]
}
```

If any GitHub call fails (warn-and-continue), the manifest retains the features array but without `github.issue` fields. The next checkpoint will retry.

## 4. Phase Retro

@../_shared/retro.md

## 5. [GATE|transitions.plan-to-implement]

Read `.beastmode/config.yaml` → resolve mode for `transitions.plan-to-implement`.
Default: `human`.

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode.
</HARD-GATE>

### [GATE-OPTION|human] Suggest Next Step

Print features and their implement commands:

```
Features ready for implementation:

1. <feature-1> → `/beastmode:implement <design>-<feature-1>`
2. <feature-2> → `/beastmode:implement <design>-<feature-2>`
```

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:implement", args="<design>-<first-feature>")` for the first feature only. User runs subsequent features manually.
