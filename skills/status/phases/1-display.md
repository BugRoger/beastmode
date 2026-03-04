# 1. Display Status

## 1. Parse Arguments

- No args → Show active worktrees and recent state files
- `list` → List all state files across phases
- `<feature>` → Show specific feature state files

## 2. Execute Command

### Default (no args)

```bash
# Show active feature worktrees
git worktree list | grep ".beastmode/worktrees/"

# Show most recent state files
ls -t .beastmode/state/design/*.md 2>/dev/null | head -3
ls -t .beastmode/state/plan/*.md 2>/dev/null | head -3
```

### List

```bash
ls -lt .beastmode/state/**/*.md 2>/dev/null
```

### Feature

```bash
ls .beastmode/state/*/YYYY-MM-DD-<feature>*.md 2>/dev/null
```

## 3. Display Output

Show:
- Feature name and date
- Active worktree (if any)
- State files across phases (design, plan, validate, release)
- Current phase (latest state file)
