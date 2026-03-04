# 0. Prime

## 1. Announce Skill

"I'm using the /design skill to help turn your idea into a design."

## 2. Role Clarity

Print:

"You own vision and preferences. I handle technical details. During design, I'll ask about what you want and how it should feel — not about implementation. That's for /plan and /implement."

## 3. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/DESIGN.md`
- `.beastmode/meta/DESIGN.md`

## 4. Load Prior Decisions

Scan `.beastmode/state/design/*.md` for existing design docs in this project.

If found (load most recent 3):
1. Extract "Key Decisions" and "Locked Decisions" sections
2. Build internal `<prior_decisions>` context
3. Use to annotate gray area options in execute phase ("You chose X in the Y design")

If none found, skip — this is expected for first designs.

## 5. Check Research Trigger

Research triggers if ANY:

**Keyword Detection** — arguments contain:
- "research", "investigate", "explore first"
- "what's SOTA", "best practices", "how do people"

**Complexity Assessment** — topic involves:
- Unfamiliar technology or domain
- External API/service integration
- User expresses uncertainty

If triggered:
1. Extract topic from arguments
2. Spawn Explore agent with `@../../agents/researcher.md`
3. Save findings to `.beastmode/state/research/YYYY-MM-DD-<topic>.md`
4. Summarize findings to user
5. Continue with design

## 6. Express Path Check

If arguments point to an existing PRD, spec, or requirements document (not a `.beastmode/state/design/` file):
1. Read the document
2. Skip gray area identification in execute
3. Jump directly to "Propose Approaches" with the doc as input

If a prior design doc exists for the same topic (matching feature name):
- Ask: "Found existing design for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh
