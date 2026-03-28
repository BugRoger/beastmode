# 3. Checkpoint

## 0. Derive Feature Name

Derive the feature slug from the topic using [worktree-manager.md](../_shared/worktree-manager.md) → "Derive Feature Name" (from user topic).

The derived feature name is used for all artifact file paths below.

## 1. Write PRD

Save to `.beastmode/state/design/YYYY-MM-DD-<feature>.md` where `<feature>` is the worktree directory name (from "Derive Feature Name").

Use this template:

```
## Problem Statement

[The problem from the user's perspective]

## Solution

[The solution from the user's perspective]

## User Stories

[Numbered list of user stories in format: As an <actor>, I want a <feature>, so that <benefit>]

## Implementation Decisions

[Flat list of implementation decisions made during the interview. Include:
- Modules that will be built/modified
- Interfaces that will be modified
- Technical clarifications
- Architectural decisions
- Schema changes, API contracts, specific interactions

Do NOT include specific file paths or code snippets — they may become outdated.]

## Testing Decisions

[Include:
- What makes a good test for this feature
- Which modules will be tested
- Prior art for tests (similar test patterns in the codebase)]

## Out of Scope

[Things explicitly excluded from this PRD]

## Further Notes

[Additional context, or "None"]

## Deferred Ideas

[Ideas that came up during the interview but were deferred as separate features, or "None"]
```

## 2. Create Manifest

Create a minimal manifest JSON so the feature is tracked from inception.

**Path:** `.beastmode/state/plan/YYYY-MM-DD-<feature>.manifest.json` where `<feature>` is the worktree directory name (from "Derive Feature Name").

Write this JSON:

```json
{
  "design": ".beastmode/state/design/YYYY-MM-DD-<feature>.md",
  "architecturalDecisions": [],
  "features": [],
  "lastUpdated": "<ISO-8601 timestamp>"
}
```

- `design` — relative path to the PRD just written in Step 1
- `architecturalDecisions` — empty array; plan phase will populate
- `features` — empty array; plan phase will populate
- `lastUpdated` — current timestamp

## 3. Sync GitHub

Read `.beastmode/config.yaml`. If `github.enabled` is `false` or missing, **skip this step entirely**.

When `github.enabled` is `true`:

@../_shared/github.md

Use warn-and-continue for all GitHub calls (see Error Handling Convention in github.md).

1. **Create Epic** using the "Create Epic" operation from github.md:
   - Title: the feature name (human-readable form)
   - Labels: `type/epic`, `phase/design`
   - Body: standard Epic template with phase set to "Design"

2. **Update Manifest** — add `github` block to the manifest written in Step 2:

```json
{
  "design": "...",
  "architecturalDecisions": [],
  "features": [],
  "github": {
    "epic": <issue-number>,
    "repo": "<owner>/<repo>"
  },
  "lastUpdated": "<ISO-8601 timestamp>"
}
```

If any GitHub call fails (warn-and-continue), the manifest is written **without** the `github` block. The next checkpoint will retry.

## 4. Phase Retro

@../_shared/retro.md

## 5. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "design(<feature>): checkpoint"
```

Print:

```
Next: just plan <feature>
```

STOP. No additional output.
