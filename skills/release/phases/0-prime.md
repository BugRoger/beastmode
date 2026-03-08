# 0. Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

Then print the phase indicator from @../_shared/visual-language.md showing **release** as the current phase.

@../_shared/persona.md

## 2. Load Project Context

Read (if they exist):
- `.beastmode/context/RELEASE.md`
- `.beastmode/meta/RELEASE.md`

Follow L2 convention paths (`context/release/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Follow [worktree-manager.md](../_shared/worktree-manager.md):

1. **Discover Feature** — resolve feature name from arguments or filesystem scan. Uses "Derive Feature Name" for extraction. Do NOT search for similarly named worktrees or artifacts.
2. **Enter Worktree** — cd into the worktree and verify with pwd.

## 4. Load Artifacts

From the worktree, locate:
- Design doc path (`.beastmode/state/design/YYYY-MM-DD-<feature>.md`)
- Plan doc path (`.beastmode/state/plan/YYYY-MM-DD-<feature>.md`)
- Validation report path (`.beastmode/state/validate/YYYY-MM-DD-<feature>.md`)
