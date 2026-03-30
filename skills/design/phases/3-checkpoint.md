# 3. Checkpoint

## 0. Resolve Feature Slug

The feature slug is either provided as the skill argument or, when the design was started without a slug (hex temp name), it must be proposed and confirmed here.

If the skill argument is a hex temp slug (6-character lowercase hex string like `d7f3a1`):
- Proceed to the slug proposal gate (step 1) to derive a real slug
- The real slug will be used for all artifact paths below

If the skill argument is already a meaningful slug:
- Use it directly — skip the proposal gate

## 1. [GATE|design.slug-proposal]

### 1.1 [GATE-OPTION|human] Ask User

Synthesize a short, hyphenated slug from the problem statement and solution discussed during the design interview. The slug should be:
- Lowercase, hyphenated
- Concise (2-4 words)
- Descriptive of the actual feature, not a guess

Present to the user:

```
Proposed slug: <proposed-slug>

This will be used for the PRD filename and all downstream references.
```

Options:
- Confirm the proposed slug
- Override with a different slug (user provides their own)
- Ask for a different suggestion

Use the confirmed slug for all subsequent steps.

### 1.2 [GATE-OPTION|auto] Claude Decides

Synthesize a short, hyphenated slug from the problem statement and solution. Use it directly without prompting.

Log: "Gate `design.slug-proposal` → auto: used slug `<slug>`"

## 2. Write PRD

Save to `.beastmode/artifacts/design/YYYY-MM-DD-<feature>.md` where `<feature>` is the confirmed slug (from step 0 or step 1).

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

## 3. Phase Retro

> **SKIP SECTION** — "Quick-Exit Check": Design PRDs always contain decisions worth capturing. Always run the full retro.

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
