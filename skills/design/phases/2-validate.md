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

## 3. User Approval Gate

<HARD-GATE>
User must explicitly approve the design before proceeding.
</HARD-GATE>

Ask: "Does this design look complete? Ready to document?"

Options:
- Yes, document it
- No, let's revise [specify what]
