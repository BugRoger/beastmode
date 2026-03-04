# 0. Prime

## 1. Announce Skill

"I'm using the /release skill to ship this feature."

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

## 4. Enter Worktree

```bash
if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
  cd "$worktree_path"
fi
```

## 5. Determine Version

```bash
# Find last release tag
last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")

# List commits since last release
git log ${last_tag}..HEAD --oneline
```

Detect version bump from commit messages:
- Any `BREAKING CHANGE` or `!:` suffix → **major** bump
- Any `feat:` or `feat(` prefix → **minor** bump
- Otherwise → **patch** bump

Present suggested version via AskUserQuestion with override option.
