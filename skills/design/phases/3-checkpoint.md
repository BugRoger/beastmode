# 3. Checkpoint

## 0. Resolve Feature Slug

The feature slug comes from the skill argument. Use it directly for all artifact file paths below.

## 1. Write PRD

Save to `.beastmode/state/design/YYYY-MM-DD-<feature>.md` where `<feature>` is the feature slug (from step 0).

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
- Interfaces that will be modified
- Technical clarifications
- Architectural decisions
- Schema changes, API contracts, specific interactions

Do NOT include specific file paths or code snippets — they may become outdated.]

## Testing Decisions

[Include:
- What makes a good test for this feature
- Prior art for tests (similar test patterns in the codebase)]

## Out of Scope

[Things explicitly excluded from this PRD]

## Further Notes

[Additional context, or "None"]

## Deferred Ideas

[Ideas that came up during the interview but were deferred as separate features, or "None"]
```

## 1.5. Write Phase Output

Write the phase output contract file to `.beastmode/state/design/YYYY-MM-DD-<feature>.output.json`:

```json
{
  "status": "completed",
  "artifacts": {
    "design": ".beastmode/state/design/YYYY-MM-DD-<feature>.md"
  }
}
```

Where the `design` path matches the PRD written in Step 1.

## 2. Create Manifest

Create a minimal manifest JSON so the feature is tracked from inception.

**Path:** `.beastmode/state/plan/YYYY-MM-DD-<feature>.manifest.json` where `<feature>` is the feature slug (from step 0).

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

## 3. Phase Retro

@../_shared/retro.md

## 4. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "design(<feature>): checkpoint"
```

Print:

```
Next: beastmode plan <feature>
```

STOP. No additional output.
