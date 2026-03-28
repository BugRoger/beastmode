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

Resolve the design artifact using [worktree-manager.md](../_shared/worktree-manager.md) → "Resolve Artifact" with type=`design` and the feature name from step 1.

Read the resolved file path.
