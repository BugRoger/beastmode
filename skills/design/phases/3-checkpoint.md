# 3. Checkpoint

## 0. Resolve Feature Slug

The feature slug is either provided as the skill argument or, when the design was started without a slug (hex temp name), it must be derived here.

If the skill argument is a hex temp slug (6-character lowercase hex string like `d7f3a1`):
- Synthesize a short, hyphenated slug from the problem statement and solution. Use it directly without prompting.
- Log: "Auto-derived slug: `<slug>`"

If the skill argument is already a meaningful slug:
- Use it directly

## 1. Write PRD

Save to `.beastmode/artifacts/design/YYYY-MM-DD-<feature>.md` where `<feature>` is the resolved slug from step 0.

Use this template:

```
---
phase: design
slug: <hex>
epic: <feature>
---

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

## 2. Commit and Handoff

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
