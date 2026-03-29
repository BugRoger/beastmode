#!/bin/sh
# generate-output-json.sh — Stop hook that reads artifact frontmatter
# and generates the output.json completion contract.
#
# Runs after Claude finishes responding. Scans .beastmode/artifacts/<phase>/
# for the most recently modified .md file with YAML frontmatter, parses it,
# and writes the corresponding output.json file.
#
# Idempotent: safe to run multiple times; same input produces same output.
# Exits 0 always — hook failure must never block Claude.

set -e

ARTIFACTS_DIR=".beastmode/artifacts"

# Bail if artifacts dir doesn't exist (not in a beastmode worktree)
if [ ! -d "$ARTIFACTS_DIR" ]; then
  exit 0
fi

# --- Frontmatter parser ---
# Extracts a YAML frontmatter value by key from a file.
# Usage: fm_get <file> <key>
# Returns empty string if not found.
fm_get() {
  _file="$1"
  _key="$2"
  sed -n '/^---$/,/^---$/p' "$_file" 2>/dev/null \
    | grep "^${_key}:" \
    | head -1 \
    | sed "s/^${_key}:[[:space:]]*//" \
    | sed 's/^["'"'"']//' \
    | sed 's/["'"'"']$//' \
    | tr -d '\r'
}

# Check if a file has YAML frontmatter (starts with ---)
has_frontmatter() {
  head -1 "$1" 2>/dev/null | grep -q '^---$'
}

# --- Scan for artifacts with frontmatter ---
# Find the most recently modified .md file with frontmatter across all phases.
# We check each phase directory for .md files (not .output.json, not .tasks.json).

latest_file=""
latest_mtime=0

for phase_dir in "$ARTIFACTS_DIR"/design "$ARTIFACTS_DIR"/plan "$ARTIFACTS_DIR"/implement "$ARTIFACTS_DIR"/validate "$ARTIFACTS_DIR"/release; do
  [ -d "$phase_dir" ] || continue

  for f in "$phase_dir"/*.md; do
    [ -f "$f" ] || continue
    has_frontmatter "$f" || continue

    # Get modification time (portable: stat -f on macOS, stat -c on Linux)
    if stat -f %m "$f" >/dev/null 2>&1; then
      mtime=$(stat -f %m "$f")
    else
      mtime=$(stat -c %Y "$f" 2>/dev/null || echo 0)
    fi

    if [ "$mtime" -gt "$latest_mtime" ]; then
      latest_mtime="$mtime"
      latest_file="$f"
    fi
  done
done

# No artifact with frontmatter found — nothing to do
if [ -z "$latest_file" ]; then
  exit 0
fi

# --- Parse frontmatter ---
phase=$(fm_get "$latest_file" "phase")
slug=$(fm_get "$latest_file" "slug")
epic=$(fm_get "$latest_file" "epic")
feature=$(fm_get "$latest_file" "feature")
status=$(fm_get "$latest_file" "status")
bump=$(fm_get "$latest_file" "bump")

# Phase is required
if [ -z "$phase" ]; then
  exit 0
fi

# Derive the output filename from the artifact filename
artifact_basename=$(basename "$latest_file" .md)
output_file="$ARTIFACTS_DIR/$phase/${artifact_basename}.output.json"

# --- Build output.json per phase ---
case "$phase" in
  design)
    # Design: { status, artifacts: { design: <path> } }
    _status="${status:-completed}"
    cat > "${output_file}.tmp" <<ENDJSON
{
  "status": "$_status",
  "artifacts": {
    "design": "$latest_file"
  }
}
ENDJSON
    ;;

  plan)
    # Plan: { status, artifacts: { features: [...] } }
    # Scan all plan artifacts for this epic to build feature list
    _epic="${epic:-$slug}"
    _features="[]"

    if [ -n "$_epic" ] && [ -d "$ARTIFACTS_DIR/plan" ]; then
      _feat_json=""
      for pf in "$ARTIFACTS_DIR/plan/"*"-${_epic}-"*.md; do
        [ -f "$pf" ] || continue
        has_frontmatter "$pf" || continue
        _f_feature=$(fm_get "$pf" "feature")
        [ -n "$_f_feature" ] || continue
        _f_basename=$(basename "$pf" .md)
        if [ -n "$_feat_json" ]; then
          _feat_json="${_feat_json},"
        fi
        _feat_json="${_feat_json}
      {\"slug\": \"${_f_feature}\", \"plan\": \"${_f_basename}.md\"}"
      done
      if [ -n "$_feat_json" ]; then
        _features="[${_feat_json}
    ]"
      fi
    fi

    cat > "${output_file}.tmp" <<ENDJSON
{
  "status": "${status:-completed}",
  "artifacts": {
    "features": $_features
  }
}
ENDJSON
    ;;

  implement)
    # Implement: { status, artifacts: { features: [{ slug, status }], deviations? } }
    _status="${status:-completed}"
    _feature="${feature:-unknown}"
    cat > "${output_file}.tmp" <<ENDJSON
{
  "status": "$_status",
  "artifacts": {
    "features": [
      {"slug": "$_feature", "status": "$_status"}
    ]
  }
}
ENDJSON
    ;;

  validate)
    # Validate: { status, artifacts: { report: <path>, passed: bool } }
    _status="${status:-passed}"
    _passed="true"
    if [ "$_status" = "failed" ]; then
      _passed="false"
      _status="error"
    else
      _status="completed"
    fi
    cat > "${output_file}.tmp" <<ENDJSON
{
  "status": "$_status",
  "artifacts": {
    "report": "$latest_file",
    "passed": $_passed
  }
}
ENDJSON
    ;;

  release)
    # Release: { status, artifacts: { version: <bump>, changelog?: <path> } }
    _bump="${bump:-patch}"
    cat > "${output_file}.tmp" <<ENDJSON
{
  "status": "${status:-completed}",
  "artifacts": {
    "version": "$_bump",
    "changelog": "$latest_file"
  }
}
ENDJSON
    ;;

  *)
    # Unknown phase — skip
    exit 0
    ;;
esac

# Atomic write: tmp -> final
mv "${output_file}.tmp" "$output_file"

exit 0
