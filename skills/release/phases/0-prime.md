# 0. Prime

## 1. Resolve Feature Name

The feature name comes from the skill arguments. Use it directly for all artifact paths in this phase.

## 2. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 3. Load Project Context

Read (if they exist):
- `.beastmode/context/RELEASE.md`
- `.beastmode/meta/RELEASE.md`

Follow L2 convention paths (`context/release/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 4. Load Artifacts

From the worktree, locate:
- Design doc path (`.beastmode/state/design/YYYY-MM-DD-<feature>.md`)
- Plan doc path (`.beastmode/state/plan/YYYY-MM-DD-<feature>.md`)
- Validation report path (`.beastmode/state/validate/YYYY-MM-DD-<feature>.md`)
