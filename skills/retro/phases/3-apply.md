# 3. Apply Changes

## 0. Enter Cycle Worktree

Read worktree from most recent status file and change into it:

```bash
# Find most recent status file
status_file=$(ls -t .agents/status/*.md 2>/dev/null | head -1)

# Extract worktree path
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')

if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
  cd "$worktree_path"
fi
```

## 1. Apply Approved Updates

For each approved change:
- Update the prime file
- Verify the change is correct

## 2. Update CLAUDE.md

If any prime files changed, update the Rules Summary in `.agents/CLAUDE.md` to stay in sync.

## 3. Optional: Engineering Dance Off

For substantial changes, run the deep analysis phase:
- [references/engineering-dance-off.md](../references/engineering-dance-off.md)

## 4. Suggest Next Step

```
Prime docs updated!

No commit yet — all changes will be committed together at /release.

Ready to ship?
/release
```

**Do NOT commit.** Unified commit at /release.

## 5. Session Tracking

@../_shared/session-tracking.md

## 6. Context Report

@../_shared/context-report.md
