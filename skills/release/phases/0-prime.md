# 0. Prime

## 1. Announce Skill

"I'm using the /release skill to ship this feature."

## 2. Load Context

Read (if they exist):
- `.beastmode/context/RELEASE.md`
- `.beastmode/meta/RELEASE.md`

## 3. Load Artifacts

Read status file to find:
- Worktree path and branch
- Design doc path
- Plan doc path
- Validation report path

```bash
status_file=$(ls -t .agents/status/*.md 2>/dev/null | head -1)

worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')
worktree_branch=$(grep -A2 "^## Worktree" "$status_file" | grep "Branch:" | sed 's/.*Branch:\s*//' | tr -d '`')
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
