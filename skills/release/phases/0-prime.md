# 0. Prime

## 1. Announce Skill

Announce that you're starting /release in persona voice. One sentence. Don't oversell it.

@../_shared/persona.md

## 2. Load Context

Read (if they exist):
- `.beastmode/context/RELEASE.md`
- `.beastmode/meta/RELEASE.md`

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
