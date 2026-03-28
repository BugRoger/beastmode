# 3. Checkpoint

<HARD-GATE>
## 0. Create Feature Worktree

1. **Derive Feature** — from the resolved topic using [worktree-manager.md](../_shared/worktree-manager.md) → "Derive Feature Name".
2. **Create Worktree** — using [worktree-manager.md](../_shared/worktree-manager.md) → "Create Worktree".

All subsequent work MUST happen inside the worktree.
</HARD-GATE>

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

## 2. Phase Retro

@../_shared/retro.md

## 3. [GATE|transitions.design-to-plan]

Read `.beastmode/config.yaml` → resolve mode for `transitions.design-to-plan`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:plan <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:plan", args="<feature>")`
