# 0. Prime

## 1. Resolve Feature Name

The feature name comes from the skill arguments. Use it directly for all artifact paths in this phase.

## 2. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 3. Load Project Context

Read (if they exist):
- `.beastmode/context/PLAN.md`
- `.beastmode/meta/PLAN.md`

Follow L2 convention paths (`context/plan/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 4. Check Research Trigger

Research triggers if ANY:
- Arguments contain research keywords
- Design references unfamiliar technology
- Complex integration required

If triggered, spawn Explore agent with `@../../agents/common-researcher.md`, save findings, summarize to user and continue to next step.

## 5. Read Design Document

Locate the design artifact by convention glob:

```bash
matches=$(ls .beastmode/artifacts/design/*-$feature.md 2>/dev/null)
```

If no matches, error: "No design artifact found for feature '$feature'". If multiple, take the latest (date prefix sorts chronologically).

Read the resolved file path.
