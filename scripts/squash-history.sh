#!/usr/bin/env bash
set -euo pipefail

# Squash History — One commit per version tag
#
# Rebuilds main as a linear sequence of squashed commits,
# one per version tag. Archives existing feature branches.
#
# Usage: bash scripts/squash-history.sh [--dry-run]
#
# DESTRUCTIVE: Requires force push after running.

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== DRY RUN — no changes will be made ==="
fi

# Ensure we're on main and clean
current_branch=$(git branch --show-current)
if [[ "$current_branch" != "main" ]]; then
  echo "Error: Must be on main branch. Currently on: $current_branch"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: Working directory not clean. Commit or stash changes first."
  exit 1
fi

# Collect version tags sorted by version
mapfile -t TAGS < <(git tag -l 'v*' --sort=version:refname)
echo "Found ${#TAGS[@]} version tags: ${TAGS[*]}"

# Archive existing feature branches
echo ""
echo "=== Archiving feature branches ==="
for branch in $(git branch -r --list 'origin/feature/*' | sed 's|origin/||'); do
  archive_tag="archive/$branch"
  if git rev-parse "$archive_tag" >/dev/null 2>&1; then
    echo "  Skip: $archive_tag already exists"
  else
    if $DRY_RUN; then
      echo "  Would archive: $branch → $archive_tag"
    else
      git tag "$archive_tag" "origin/$branch"
      echo "  Archived: $branch → $archive_tag"
    fi
  fi
done

# Also archive local feature branches
for branch in $(git branch --list 'feature/*' | sed 's/^[* ]*//' ); do
  archive_tag="archive/$branch"
  if git rev-parse "$archive_tag" >/dev/null 2>&1; then
    echo "  Skip: $archive_tag already exists"
  else
    if $DRY_RUN; then
      echo "  Would archive: $branch → $archive_tag"
    else
      git tag "$archive_tag" "$branch"
      echo "  Archived: $branch → $archive_tag"
    fi
  fi
done

if $DRY_RUN; then
  echo ""
  echo "=== DRY RUN — would create ${#TAGS[@]} squashed commits ==="
  for tag in "${TAGS[@]}"; do
    echo "  $tag"
  done
  echo ""
  echo "Run without --dry-run to execute."
  exit 0
fi

# Build new linear history
echo ""
echo "=== Building squashed history ==="

# Read CHANGELOG.md for commit messages
CHANGELOG="CHANGELOG.md"

parent=""
for tag in "${TAGS[@]}"; do
  # Get tree at this tag
  tree=$(git rev-parse "$tag^{tree}")

  # Extract title from CHANGELOG (e.g., "### v0.10.0 — The Visible Gate (Mar 2026)")
  title=$(grep -m1 "### $tag " "$CHANGELOG" 2>/dev/null | sed 's/^### //' | sed 's/ (.*)//' || echo "$tag")

  # Extract body (lines between this version header and the next ### or ---)
  body=$(awk "/^### $tag /{found=1; next} /^### v|^---/{if(found) exit} found{print}" "$CHANGELOG" 2>/dev/null || echo "")

  # Build commit message
  msg="Release $title"
  if [[ -n "$body" ]]; then
    msg="$msg

## Changes
$body"
  fi

  # Create commit
  if [[ -z "$parent" ]]; then
    # First commit — no parent
    new_commit=$(git commit-tree "$tree" -m "$msg")
  else
    new_commit=$(git commit-tree "$tree" -p "$parent" -m "$msg")
  fi

  echo "  $tag → $(echo "$new_commit" | head -c 7) — $title"
  parent="$new_commit"
done

# Point main at the new history
echo ""
echo "=== Updating main ==="
git update-ref refs/heads/main "$parent"
git checkout main

# Move version tags to new commits
echo ""
echo "=== Relocating version tags ==="
parent=""
for tag in "${TAGS[@]}"; do
  tree=$(git rev-parse "$tag^{tree}")

  # Find the new commit with this tree
  new_commit=$(git log --format='%H %T' main | grep " $tree$" | head -1 | cut -d' ' -f1)

  if [[ -n "$new_commit" ]]; then
    git tag -f "$tag" "$new_commit"
    echo "  $tag → $(echo "$new_commit" | head -c 7)"
  else
    echo "  WARNING: Could not find new commit for $tag"
  fi
done

echo ""
echo "=== Done ==="
echo "Review with: git log --oneline main"
echo ""
echo "When satisfied, push with:"
echo "  git push --force origin main"
echo "  git push --force --tags origin"
