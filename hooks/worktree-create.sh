#!/bin/bash
# WorktreeCreate hook — bridges Claude Code's --worktree flag with
# beastmode's feature/<name> branch convention.
#
# Receives JSON on stdin from Claude Code:
#   { "worktree_name": "...", "worktree_path": "...", "cwd": "..." }
#
# If feature/<name> branch exists: worktree from that branch.
# If not: new branch from origin/HEAD (or HEAD if no remote).

set -euo pipefail

INPUT=$(cat)

# Extract worktree_name from JSON (simple sed — input is flat JSON from Claude)
WORKTREE_NAME=$(printf '%s' "$INPUT" | tr -d '\n' | sed -n 's/.*"worktree_name" *: *"\([^"]*\)".*/\1/p')

if [ -z "$WORKTREE_NAME" ]; then
  echo "ERROR: No worktree_name in hook input" >&2
  exit 2
fi

BRANCH="feature/$WORKTREE_NAME"
WORKTREE_PATH=".claude/worktrees/$WORKTREE_NAME"

# Clean up stale worktree references from previous sessions
git worktree prune 2>/dev/null || true

# Check if feature branch exists (local or remote)
if git show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null || \
   git show-ref --verify --quiet "refs/remotes/origin/$BRANCH" 2>/dev/null; then
  # Existing feature branch — create worktree from it
  git worktree add "$WORKTREE_PATH" "$BRANCH"
else
  # New feature — create branch from origin/HEAD (or HEAD if no remote)
  BASE=$(git rev-parse --verify origin/HEAD 2>/dev/null || git rev-parse HEAD)
  git worktree add "$WORKTREE_PATH" -b "$BRANCH" "$BASE"
fi

echo "$WORKTREE_PATH"
