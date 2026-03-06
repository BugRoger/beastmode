# 2. Validate

## 1. Completeness Check

Verify design covers:
- [ ] Goal statement
- [ ] Approach summary
- [ ] Key decisions with rationale
- [ ] Component breakdown
- [ ] Files affected
- [ ] Testing strategy (if applicable)
- [ ] Locked decisions clearly marked
- [ ] Claude's Discretion areas identified
- [ ] Acceptance criteria present
- [ ] Deferred ideas captured (or "none")

If missing sections, go back to Execute phase.

## 2. Anti-Pattern Check

If the design produced fewer than 3 decisions, print:

"This is a lightweight design — that's fine. Even simple designs benefit from explicit approval to prevent wasted implementation."

Do NOT skip approval. Short designs still need the gate.

## 3. Executive Summary

Before asking for approval, present a consolidated executive summary of the design so the user can review the full picture in one place.

Print:

```
### Executive Summary

**Goal**: [one-sentence goal from the design]

**Approach**: [one-sentence approach summary]

**Locked Decisions:**

| Decision | Choice |
|----------|--------|
| [decision 1] | [choice] |
| [decision 2] | [choice] |
| ... | ... |

**Acceptance Criteria:**
- [ ] [criterion 1]
- [ ] [criterion 2]
- [ ] ...
```

Render this from the decisions and criteria gathered during the execute phase. Do NOT ask new questions — this is a read-only summary of what was already discussed.

## 4. [GATE|design.design-approval]

Read `.beastmode/config.yaml` → resolve mode for `design.design-approval`.
Default: `human`.

### [GATE-OPTION|human] User Approval

Ask: "Does this design look complete? Ready to document?"

Options:
- Yes, document it
- No, let's revise [specify what]

Wait for user response before continuing.

### [GATE-OPTION|auto] Self-Approve

Log: "Gate `design.design-approval` → auto: approved"
Proceed to checkpoint.
