# 3. Checkpoint

## 1. Write Feature Plan Files

For each feature, save to `.beastmode/state/plan/YYYY-MM-DD-<design>-<feature-slug>.md` using the template from [feature-format.md](../references/feature-format.md).

Where `<design>` is the epic slug and `<feature-slug>` is the feature's name slug.

## 1.5. Write Phase Output

Write the phase output contract file to `.beastmode/state/plan/YYYY-MM-DD-<design>.output.json`:

```json
{
  "status": "completed",
  "artifacts": {
    "features": [
      {"slug": "<feature-slug>", "plan": "YYYY-MM-DD-<design>-<feature-slug>.md"}
    ]
  }
}
```

The `features` array mirrors the features written in Step 1 — one entry per feature with slug and plan filename.

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

Preserve any existing fields — only add/overwrite `architecturalDecisions`, `features`, and `lastUpdated`.

## 3. Phase Retro

@../_shared/retro.md

## 4. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "plan(<feature>): checkpoint"
```

Print features and their implement commands:

```
Features ready for implementation:

1. <feature-1> → beastmode implement <design> <feature-1>
2. <feature-2> → beastmode implement <design> <feature-2>
```

STOP. No additional output.
