# Worktree Manager

## Read Worktree from Status

```bash
get_worktree_path() {
  local status_file="$1"
  grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`'
}
```

## Worktree Section Format

Add to status file after `## Context`:

```markdown
## Worktree
- **Path**: `.agents/worktrees/cycle/<topic>`
- **Branch**: `cycle/<topic>`
```

## Create Worktree

```bash
create_cycle_worktree() {
  local topic="$1"
  local path=".agents/worktrees/cycle/$topic"
  local branch="cycle/$topic"

  mkdir -p .agents/worktrees/cycle
  git check-ignore -q .agents/worktrees 2>/dev/null || {
    echo ".agents/worktrees/" >> .gitignore
  }
  git worktree add "$path" -b "$branch"
  echo "$path"
}
```

## Verify Worktree Exists

```bash
verify_worktree() {
  local path="$1"
  if [ ! -d "$path" ]; then
    echo "Error: Worktree at $path not found"
    return 1
  fi
}
```

## Remove Worktree Section

After merge/cleanup, remove `## Worktree` section from status file.
