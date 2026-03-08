#!/bin/bash
# Context Bridge — PostToolUse Hook
# Reads persisted context metrics and injects them as additionalContext.
# Receives tool event JSON on stdin including session_id.

STALE_SECONDS=60

input=$(cat)

SESSION_ID=$(echo "$input" | jq -r '.session_id // empty')

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

METRICS_FILE="/tmp/beastmode-${SESSION_ID}.json"

if [ ! -f "$METRICS_FILE" ]; then
  exit 0
fi

# Check staleness
TIMESTAMP=$(jq -r '.timestamp // 0' "$METRICS_FILE")
NOW=$(date +%s)
AGE=$(( NOW - TIMESTAMP ))

if [ "$AGE" -gt "$STALE_SECONDS" ]; then
  exit 0
fi

USED=$(jq -r '.used_pct' "$METRICS_FILE")
REMAINING=$(jq -r '.remaining_pct' "$METRICS_FILE")
WINDOW=$(jq -r '.context_window_size' "$METRICS_FILE")

jq -n \
  --arg msg "Context: ${USED}% used, ${REMAINING}% remaining (${WINDOW} window)" \
  '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $msg}}'
