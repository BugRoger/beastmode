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

## 3. Load Artifacts

Find worktree path and branch from active worktrees:
- Design doc path
- Plan doc path
- Validation report path

```bash
# Find active feature worktree
worktree_line=$(git worktree list | grep ".beastmode/worktrees/" | head -1)
worktree_path=$(echo "$worktree_line" | awk '{print $1}')
worktree_branch=$(echo "$worktree_line" | grep -o '\[.*\]' | tr -d '[]')
```
