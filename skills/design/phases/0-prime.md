# 0. Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

Then print the phase indicator from @../_shared/visual-language.md showing **design** as the current phase.

@../_shared/persona.md

## 2. Load Project Context

Read (if they exist):
- `.beastmode/context/DESIGN.md`
- `.beastmode/meta/DESIGN.md`

Follow L2 convention paths (`context/design/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 3. Check Research Trigger

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
4. Summarize findings to user and continue to next step

## 4. Express Path Check

If arguments point to an existing PRD, spec, or requirements document (not a `.beastmode/state/design/` file):
1. Read the document
2. Skip gray area identification in execute
3. Jump directly to "Propose Approaches" with the doc as input

## 5. [GATE|design.existing-design-choice]

Read `.beastmode/config.yaml` → resolve mode for `design.existing-design-choice`.
Default: `human`.

### [GATE-OPTION|human] Ask User

If a prior design doc exists for the same topic (matching feature name):
- Ask: "Found existing design for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh

### [GATE-OPTION|auto] Claude Decides

Read the existing design and decide whether to update or start fresh based on how different the new requirements are.
Log: "Gate `design.existing-design-choice` → auto: <decision>"
