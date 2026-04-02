# 2. Validate

## 1. Completeness Check

Verify PRD covers all required sections:
- [ ] Problem Statement
- [ ] Solution
- [ ] User Stories (3+ items)
- [ ] Implementation Decisions
- [ ] Testing Decisions
- [ ] Out of Scope
- [ ] Further Notes (or "none")
- [ ] Deferred ideas captured (or "none")

If missing sections, go back to Execute phase.

## 2. Anti-Pattern Check

If the PRD produced fewer than 3 user stories, print:

"This is a lightweight PRD — that's fine. Even simple features benefit from explicit approval to prevent wasted implementation."

Do NOT skip approval. Short PRDs still need approval.

## 3. Executive Summary

Before asking for approval, present a consolidated executive summary so the user can review the full picture in one place.

Print:

```
### Executive Summary

**Problem**: [one-sentence problem statement]

**Solution**: [one-sentence solution summary]

**Key Decisions:**

| Decision | Choice |
|----------|--------|
| [decision 1] | [choice] |
| [decision 2] | [choice] |
| ... | ... |

**User Stories:** [count] stories covering [summary of scope]
```

Render this from the decisions and stories gathered during the execute phase. Do NOT ask new questions — this is a read-only summary of what was already discussed.

## 4. PRD Approval

Ask: "Does this PRD look complete? Ready to document?"

Options:
- Yes, document it
- No, let's revise [specify what]

Wait for user response before continuing.
