# 3. Checkpoint

## 0. Resolve Feature Slug

The feature slug comes from the skill argument. Use it directly for all artifact file paths below (under `.beastmode/artifacts/`).

## 1. Write PRD

Save to `.beastmode/artifacts/design/YYYY-MM-DD-<feature>.md` where `<feature>` is the feature slug (from step 0).

Use this template:

```
---
phase: design
slug: <feature>
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

## 2. Phase Retro

> **SKIP SECTION** — "Quick-Exit Check": Design PRDs always contain decisions worth capturing. Always run the full retro.

@../_shared/retro.md

## 3. Commit and Handoff

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
